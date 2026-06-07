from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import FamilyMember, User
from ..schemas import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_family_members(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(User)
        .join(FamilyMember, FamilyMember.user_id == User.id)
        .filter(FamilyMember.family_id == current.family_id)
        .order_by(User.full_name)
        .all()
    )
    return rows
