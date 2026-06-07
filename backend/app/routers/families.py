from fastapi import APIRouter, Depends

from ..dependencies import CurrentUser, get_current_user
from ..schemas import FamilyRead

router = APIRouter(prefix="/families", tags=["families"])


@router.get("/current", response_model=FamilyRead)
def current_family(current: CurrentUser = Depends(get_current_user)):
    return current.family
