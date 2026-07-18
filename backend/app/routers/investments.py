from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..auth import pesos_to_cents, quantity_to_units
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import Investment
from ..schemas import InvestmentCreate, InvestmentRead, InvestmentUpdate
from ._helpers import investment_to_dict

router = APIRouter(prefix="/investments", tags=["investments"])


@router.get("", response_model=list[InvestmentRead])
def list_investments(
    asset_type: str | None = Query(default=None, max_length=32),
    search: str | None = Query(default=None, max_length=120),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Investment)
        .options(joinedload(Investment.user))
        .filter(Investment.family_id == current.family_id)
    )
    if asset_type:
        query = query.filter(Investment.asset_type == asset_type)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Investment.asset_name.ilike(pattern),
                Investment.symbol.ilike(pattern),
                Investment.institution.ilike(pattern),
            )
        )
    rows = query.order_by(Investment.current_value_cents.desc(), Investment.created_at.desc()).all()
    return [investment_to_dict(row) for row in rows]


@router.post("", response_model=InvestmentRead, status_code=status.HTTP_201_CREATED)
def create_investment(
    payload: InvestmentCreate,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invested_amount_cents = pesos_to_cents(payload.invested_amount)
    investment = Investment(
        family_id=current.family_id,
        user_id=current.user.id,
        asset_name=payload.asset_name.strip(),
        asset_type=payload.asset_type,
        symbol=payload.symbol.strip().upper() if payload.symbol else None,
        quantity_units=quantity_to_units(payload.quantity),
        invested_amount_cents=invested_amount_cents,
        current_value_cents=(
            pesos_to_cents(payload.current_value)
            if payload.current_value is not None
            else invested_amount_cents
        ),
        acquisition_date=payload.acquisition_date,
        institution=payload.institution.strip() if payload.institution else None,
        notes=payload.notes,
    )
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment_to_dict(investment)


@router.put("/{investment_id}", response_model=InvestmentRead)
def update_investment(
    investment_id: int,
    payload: InvestmentUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investment = (
        db.query(Investment)
        .options(joinedload(Investment.user))
        .filter(Investment.id == investment_id, Investment.family_id == current.family_id)
        .first()
    )
    if not investment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")

    values = payload.model_dump(exclude_unset=True)
    if "quantity" in values:
        quantity = values.pop("quantity")
        if quantity is not None:
            investment.quantity_units = quantity_to_units(quantity)
    if "invested_amount" in values:
        invested_amount = values.pop("invested_amount")
        if invested_amount is not None:
            investment.invested_amount_cents = pesos_to_cents(invested_amount)
    if "current_value" in values:
        current_value = values.pop("current_value")
        if current_value is not None:
            investment.current_value_cents = pesos_to_cents(current_value)
    if "asset_name" in values:
        values["asset_name"] = values["asset_name"].strip()
    if "symbol" in values:
        values["symbol"] = values["symbol"].strip().upper() if values["symbol"] else None
    if "institution" in values:
        values["institution"] = values["institution"].strip() if values["institution"] else None
    for key, value in values.items():
        setattr(investment, key, value)

    db.commit()
    db.refresh(investment)
    return investment_to_dict(investment)


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment(
    investment_id: int,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investment = (
        db.query(Investment)
        .filter(Investment.id == investment_id, Investment.family_id == current.family_id)
        .first()
    )
    if not investment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    db.delete(investment)
    db.commit()
