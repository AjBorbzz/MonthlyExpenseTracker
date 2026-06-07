from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ..auth import pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import BudgetAllocation
from ..schemas import BudgetCreate, BudgetRead, BudgetUpdate
from ._helpers import budget_to_dict, ensure_category

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(BudgetAllocation).options(joinedload(BudgetAllocation.category)).filter(BudgetAllocation.family_id == current.family_id)
    if month:
        query = query.filter(BudgetAllocation.budget_month == month)
    if year:
        query = query.filter(BudgetAllocation.budget_year == year)
    return [budget_to_dict(db, budget) for budget in query.order_by(BudgetAllocation.budget_year.desc(), BudgetAllocation.budget_month.desc()).all()]


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(payload: BudgetCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_category(db, payload.category_id, current.family_id)
    budget = BudgetAllocation(
        family_id=current.family_id,
        category_id=payload.category_id,
        budget_month=payload.budget_month,
        budget_year=payload.budget_year,
        allocated_amount_cents=pesos_to_cents(payload.allocated_amount),
    )
    db.add(budget)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Budget already exists for this category and month") from exc
    db.refresh(budget)
    return budget_to_dict(db, budget)


@router.put("/{budget_id}", response_model=BudgetRead)
def update_budget(budget_id: int, payload: BudgetUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.query(BudgetAllocation).options(joinedload(BudgetAllocation.category)).filter(BudgetAllocation.id == budget_id, BudgetAllocation.family_id == current.family_id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values and values["category_id"] is not None:
        ensure_category(db, values["category_id"], current.family_id)
    if "allocated_amount" in values:
        budget.allocated_amount_cents = pesos_to_cents(values.pop("allocated_amount"))
    for key, value in values.items():
        setattr(budget, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Budget already exists for this category and month") from exc
    db.refresh(budget)
    return budget_to_dict(db, budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.query(BudgetAllocation).filter(BudgetAllocation.id == budget_id, BudgetAllocation.family_id == current.family_id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    db.delete(budget)
    db.commit()
