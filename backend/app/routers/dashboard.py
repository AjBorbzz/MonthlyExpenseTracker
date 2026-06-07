from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..services.dashboard_service import dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month = month or date.today().month
    year = year or date.today().year
    return dashboard_summary(db, current.family_id, month, year)
