from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..auth import pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import IncomeRecord
from ..schemas import IncomeCreate, IncomeRead, IncomeUpdate
from ._helpers import income_to_dict

router = APIRouter(prefix="/income", tags=["income"])


@router.get("", response_model=list[IncomeRead])
def list_income(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(IncomeRecord).options(joinedload(IncomeRecord.user)).filter(IncomeRecord.family_id == current.family_id)
    if month:
        query = query.filter(IncomeRecord.income_month == month)
    if year:
        query = query.filter(IncomeRecord.income_year == year)
    return [income_to_dict(row) for row in query.order_by(IncomeRecord.income_year.desc(), IncomeRecord.income_month.desc()).all()]


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(payload: IncomeCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    income = IncomeRecord(
        family_id=current.family_id,
        user_id=current.user.id,
        source_name=payload.source_name,
        amount_cents=pesos_to_cents(payload.amount),
        income_month=payload.income_month,
        income_year=payload.income_year,
        notes=payload.notes,
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return income_to_dict(income)


@router.put("/{income_id}", response_model=IncomeRead)
def update_income(income_id: int, payload: IncomeUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    income = db.query(IncomeRecord).options(joinedload(IncomeRecord.user)).filter(IncomeRecord.id == income_id, IncomeRecord.family_id == current.family_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income record not found")
    values = payload.model_dump(exclude_unset=True)
    if "amount" in values:
        income.amount_cents = pesos_to_cents(values.pop("amount"))
    for key, value in values.items():
        setattr(income, key, value)
    db.commit()
    db.refresh(income)
    return income_to_dict(income)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(income_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    income = db.query(IncomeRecord).filter(IncomeRecord.id == income_id, IncomeRecord.family_id == current.family_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income record not found")
    db.delete(income)
    db.commit()
