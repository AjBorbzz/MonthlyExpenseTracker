from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..services.dashboard_service import dashboard_summary
from ..services.pdf_report_service import build_dashboard_pdf
from ..services.recurring_service import app_today, process_due_recurring_expenses

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = app_today()
    process_due_recurring_expenses(db, current.family_id, current.user.id, today)
    month = month or today.month
    year = year or today.year
    return dashboard_summary(db, current.family_id, month, year, today)


@router.get("/export.pdf")
def export_dashboard_pdf(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = app_today()
    process_due_recurring_expenses(db, current.family_id, current.user.id, today)
    month = month or today.month
    year = year or today.year
    summary = dashboard_summary(db, current.family_id, month, year, today)
    pdf = build_dashboard_pdf(summary, current.family.name, current.user.full_name, month, year)
    filename = f"family-expense-report-{year}-{month:02d}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
