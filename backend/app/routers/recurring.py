from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..auth import pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import Expense, RecurringExpense
from ..schemas import RecurringCreate, RecurringProcessResult, RecurringRead, RecurringUpdate
from ..services.recurring_service import process_due_recurring_expenses
from ._helpers import ensure_category, recurring_to_dict

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringRead])
def list_recurring(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    process_due_recurring_expenses(db, current.family_id, current.user.id)
    rows = (
        db.query(RecurringExpense)
        .options(joinedload(RecurringExpense.category), joinedload(RecurringExpense.created_by_user))
        .filter(RecurringExpense.family_id == current.family_id)
        .order_by(RecurringExpense.next_due_date.asc())
        .all()
    )
    last_generated_dates = _last_generated_dates(db, current.family_id)
    return [recurring_to_dict(item, last_generated_dates.get(item.id)) for item in rows]


@router.post("/process-due", response_model=RecurringProcessResult)
def process_due(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return process_due_recurring_expenses(db, current.family_id, current.user.id)


@router.post("", response_model=RecurringRead, status_code=status.HTTP_201_CREATED)
def create_recurring(payload: RecurringCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_category(db, payload.category_id, current.family_id)
    item = RecurringExpense(
        family_id=current.family_id,
        created_by_user_id=current.user.id,
        category_id=payload.category_id,
        name=payload.name,
        amount_cents=pesos_to_cents(payload.amount),
        frequency=payload.frequency,
        next_due_date=payload.next_due_date,
        anchor_day=payload.next_due_date.day,
        anchor_month=payload.next_due_date.month,
        merchant=payload.merchant,
        payment_method=payload.payment_method,
        is_active=payload.is_active,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    process_due_recurring_expenses(db, current.family_id, current.user.id)
    db.refresh(item)
    last_generated_date = _last_generated_dates(db, current.family_id).get(item.id)
    return recurring_to_dict(item, last_generated_date)


@router.put("/{recurring_id}", response_model=RecurringRead)
def update_recurring(recurring_id: int, payload: RecurringUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(RecurringExpense).options(joinedload(RecurringExpense.category), joinedload(RecurringExpense.created_by_user)).filter(RecurringExpense.id == recurring_id, RecurringExpense.family_id == current.family_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values and values["category_id"] is not None:
        ensure_category(db, values["category_id"], current.family_id)
    if "amount" in values:
        amount = values.pop("amount")
        if amount is not None:
            item.amount_cents = pesos_to_cents(amount)
    if values.get("next_due_date") is not None:
        item.anchor_day = values["next_due_date"].day
        item.anchor_month = values["next_due_date"].month
    for key, value in values.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    process_due_recurring_expenses(db, current.family_id, current.user.id)
    db.refresh(item)
    last_generated_date = _last_generated_dates(db, current.family_id).get(item.id)
    return recurring_to_dict(item, last_generated_date)


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(recurring_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(RecurringExpense).filter(RecurringExpense.id == recurring_id, RecurringExpense.family_id == current.family_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")
    has_generated_expenses = (
        db.query(Expense.id)
        .filter(
            Expense.family_id == current.family_id,
            Expense.recurring_expense_id == item.id,
        )
        .first()
        is not None
    )
    if has_generated_expenses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This schedule has generated expenses and cannot be deleted. Deactivate it instead.",
        )
    db.delete(item)
    db.commit()


def _last_generated_dates(db: Session, family_id: int) -> dict[int, date]:
    rows = (
        db.query(Expense.recurring_expense_id, func.max(Expense.recurring_due_date))
        .filter(
            Expense.family_id == family_id,
            Expense.recurring_expense_id.is_not(None),
        )
        .group_by(Expense.recurring_expense_id)
        .all()
    )
    return {recurring_id: last_date for recurring_id, last_date in rows}
