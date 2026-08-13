import csv
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import StringIO

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import extract, or_
from sqlalchemy.orm import Session, joinedload

from ..auth import cents_to_pesos, pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import Expense, ExpenseCategory
from ..schemas import ExpenseCreate, ExpenseImportResult, ExpenseRead, ExpenseUpdate
from ..services.recurring_service import process_due_recurring_expenses
from ._helpers import ensure_category, expense_to_dict

router = APIRouter(prefix="/expenses", tags=["expenses"])

IMPORT_HEADERS = [
    "expense_date",
    "description",
    "category",
    "amount",
    "merchant",
    "payment_method",
    "notes",
    "is_recurring",
]

IMPORT_TEMPLATE_ROWS = [
    ["2026-06-01", "Weekly grocery run", "Groceries", "2450.75", "SM Supermarket", "Card", "Family groceries", "false"],
    ["2026-06-02", "Taxi to school", "Transportation", "320.00", "Grab", "E-wallet", "Morning commute", "false"],
    ["2026-06-05", "Internet subscription", "Internet", "1899.00", "Converge", "Bank Transfer", "Monthly bill", "true"],
]


def _expense_query(db: Session, family_id: int):
    return (
        db.query(Expense)
        .options(joinedload(Expense.category), joinedload(Expense.user))
        .filter(Expense.family_id == family_id)
    )


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    category_id: int | None = None,
    user_id: int | None = None,
    search: str | None = None,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    process_due_recurring_expenses(db, current.family_id, current.user.id)
    query = _expense_query(db, current.family_id)
    if month:
        query = query.filter(extract("month", Expense.expense_date) == month)
    if year:
        query = query.filter(extract("year", Expense.expense_date) == year)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Expense.description.ilike(like), Expense.merchant.ilike(like), Expense.notes.ilike(like)))
    return [expense_to_dict(expense) for expense in query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()]


@router.get("/export")
def export_expenses(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    process_due_recurring_expenses(db, current.family_id, current.user.id)
    expenses = (
        _expense_query(db, current.family_id)
        .filter(extract("month", Expense.expense_date) == month, extract("year", Expense.expense_date) == year)
        .order_by(Expense.expense_date.desc())
        .all()
    )
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "description", "category", "amount", "merchant", "payment_method", "added_by", "notes"])
    for expense in expenses:
        writer.writerow(
            [
                expense.expense_date.isoformat(),
                expense.description,
                expense.category.name if expense.category else "",
                cents_to_pesos(expense.amount_cents),
                expense.merchant or "",
                expense.payment_method or "",
                expense.user.full_name if expense.user else "",
                expense.notes or "",
            ]
        )
    output.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="expenses-{year}-{month:02d}.csv"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@router.get("/import-template")
def expense_import_template():
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(IMPORT_HEADERS)
    writer.writerows(IMPORT_TEMPLATE_ROWS)
    output.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="expense-import-template.csv"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


def _normalize_bool(value: str | None) -> bool:
    if value is None or value.strip() == "":
        return False
    normalized = value.strip().lower()
    if normalized in {"true", "yes", "y", "1"}:
        return True
    if normalized in {"false", "no", "n", "0"}:
        return False
    raise ValueError("is_recurring must be true/false, yes/no, or 1/0")


def _parse_import_row(row: dict[str, str], row_number: int, categories_by_name: dict[str, ExpenseCategory]) -> dict:
    missing = [header for header in ["expense_date", "description", "category", "amount"] if not row.get(header, "").strip()]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")

    try:
        expense_date = datetime.strptime(row["expense_date"].strip(), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("expense_date must use YYYY-MM-DD format") from exc

    try:
        amount = Decimal(row["amount"].strip())
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("amount must be a valid number") from exc
    if amount <= 0:
        raise ValueError("amount must be greater than 0")

    category_name = row["category"].strip().lower()
    category = categories_by_name.get(category_name)
    if not category:
        raise ValueError(f"Category '{row['category'].strip()}' was not found. Create it first or use an existing category name.")

    description = row["description"].strip()
    if len(description) > 255:
        raise ValueError("description must be 255 characters or fewer")

    return {
        "category_id": category.id,
        "amount_cents": pesos_to_cents(amount),
        "description": description,
        "merchant": row.get("merchant", "").strip() or None,
        "payment_method": row.get("payment_method", "").strip() or None,
        "expense_date": expense_date,
        "notes": row.get("notes", "").strip() or None,
        "is_recurring": _normalize_bool(row.get("is_recurring")),
    }


def _is_duplicate_expense(db: Session, family_id: int, values: dict) -> bool:
    return (
        db.query(Expense.id)
        .filter(
            Expense.family_id == family_id,
            Expense.category_id == values["category_id"],
            Expense.amount_cents == values["amount_cents"],
            Expense.description == values["description"],
            Expense.expense_date == values["expense_date"],
            Expense.merchant == values["merchant"],
        )
        .first()
        is not None
    )


@router.post("/import", response_model=ExpenseImportResult)
async def import_expenses(
    file: UploadFile = File(...),
    skip_duplicates: bool = Query(default=True),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please upload a .csv file")

    raw = await file.read()
    if len(raw) > 2_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="CSV file is too large. Limit is 2 MB.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CSV must be UTF-8 encoded") from exc

    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CSV is missing a header row")

    normalized_fieldnames = [field.strip().lower() for field in reader.fieldnames]
    missing_headers = [header for header in IMPORT_HEADERS if header not in normalized_fieldnames]
    if missing_headers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV is missing required header(s): {', '.join(missing_headers)}",
        )

    categories = (
        db.query(ExpenseCategory)
        .filter(ExpenseCategory.family_id == current.family_id, ExpenseCategory.is_active.is_(True))
        .all()
    )
    categories_by_name = {category.name.strip().lower(): category for category in categories}

    imported = []
    errors = []
    skipped_count = 0

    for index, raw_row in enumerate(reader, start=2):
        if index > 502:
            errors.append({"row": index, "message": "Import limit is 500 rows per file"})
            break
        row = {key.strip().lower(): (value or "") for key, value in raw_row.items() if key}
        if not any(value.strip() for value in row.values()):
            skipped_count += 1
            continue
        try:
            values = _parse_import_row(row, index, categories_by_name)
            if skip_duplicates and _is_duplicate_expense(db, current.family_id, values):
                skipped_count += 1
                continue
            expense = Expense(family_id=current.family_id, user_id=current.user.id, **values)
            db.add(expense)
            db.flush()
            imported.append(expense)
        except ValueError as exc:
            errors.append({"row": index, "message": str(exc)})

    db.commit()
    for expense in imported:
        db.refresh(expense)

    return {
        "imported_count": len(imported),
        "skipped_count": skipped_count,
        "error_count": len(errors),
        "imported_expenses": [expense_to_dict(expense) for expense in imported],
        "errors": errors,
    }


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_category(db, payload.category_id, current.family_id)
    expense = Expense(
        family_id=current.family_id,
        user_id=current.user.id,
        category_id=payload.category_id,
        amount_cents=pesos_to_cents(payload.amount),
        description=payload.description,
        merchant=payload.merchant,
        payment_method=payload.payment_method,
        expense_date=payload.expense_date,
        notes=payload.notes,
        is_recurring=payload.is_recurring,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense_to_dict(expense)


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, payload: ExpenseUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = _expense_query(db, current.family_id).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values and values["category_id"] is not None:
        ensure_category(db, values["category_id"], current.family_id)
    if "amount" in values:
        expense.amount_cents = pesos_to_cents(values.pop("amount"))
    for key, value in values.items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense_to_dict(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.family_id == current.family_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()
