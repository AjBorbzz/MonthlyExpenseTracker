from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import pesos_to_cents
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import SavingsGoal
from ..schemas import SavingsGoalCreate, SavingsGoalRead, SavingsGoalUpdate
from ._helpers import goal_to_dict

router = APIRouter(prefix="/savings-goals", tags=["savings goals"])


@router.get("", response_model=list[SavingsGoalRead])
def list_goals(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return [goal_to_dict(goal) for goal in db.query(SavingsGoal).filter(SavingsGoal.family_id == current.family_id).order_by(SavingsGoal.created_at.desc()).all()]


@router.post("", response_model=SavingsGoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(payload: SavingsGoalCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = SavingsGoal(
        family_id=current.family_id,
        name=payload.name,
        target_amount_cents=pesos_to_cents(payload.target_amount),
        current_amount_cents=pesos_to_cents(payload.current_amount),
        target_date=payload.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal_to_dict(goal)


@router.put("/{goal_id}", response_model=SavingsGoalRead)
def update_goal(goal_id: int, payload: SavingsGoalUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.family_id == current.family_id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")
    values = payload.model_dump(exclude_unset=True)
    if "target_amount" in values:
        goal.target_amount_cents = pesos_to_cents(values.pop("target_amount"))
    if "current_amount" in values:
        goal.current_amount_cents = pesos_to_cents(values.pop("current_amount"))
    for key, value in values.items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal_to_dict(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.family_id == current.family_id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")
    db.delete(goal)
    db.commit()
