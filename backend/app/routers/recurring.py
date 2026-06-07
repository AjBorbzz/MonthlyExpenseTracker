from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..auth import pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import RecurringExpense
from ..schemas import RecurringCreate, RecurringRead, RecurringUpdate
from ._helpers import ensure_category, recurring_to_dict

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringRead])
def list_recurring(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(RecurringExpense)
        .options(joinedload(RecurringExpense.category))
        .filter(RecurringExpense.family_id == current.family_id)
        .order_by(RecurringExpense.next_due_date.asc())
        .all()
    )
    return [recurring_to_dict(item) for item in rows]


@router.post("", response_model=RecurringRead, status_code=status.HTTP_201_CREATED)
def create_recurring(payload: RecurringCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_category(db, payload.category_id, current.family_id)
    item = RecurringExpense(
        family_id=current.family_id,
        category_id=payload.category_id,
        name=payload.name,
        amount_cents=pesos_to_cents(payload.amount),
        frequency=payload.frequency,
        next_due_date=payload.next_due_date,
        is_active=payload.is_active,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return recurring_to_dict(item)


@router.put("/{recurring_id}", response_model=RecurringRead)
def update_recurring(recurring_id: int, payload: RecurringUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(RecurringExpense).options(joinedload(RecurringExpense.category)).filter(RecurringExpense.id == recurring_id, RecurringExpense.family_id == current.family_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values and values["category_id"] is not None:
        ensure_category(db, values["category_id"], current.family_id)
    if "amount" in values:
        item.amount_cents = pesos_to_cents(values.pop("amount"))
    for key, value in values.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return recurring_to_dict(item)


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(recurring_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(RecurringExpense).filter(RecurringExpense.id == recurring_id, RecurringExpense.family_id == current.family_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")
    db.delete(item)
    db.commit()
