import calendar
import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from ..models import Expense, RecurringExpense

MAX_GENERATED_PER_RUN = 500
APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Asia/Manila"))


def app_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def next_occurrence_date(item: RecurringExpense, current_due_date: date) -> date:
    if item.frequency == "weekly":
        return current_due_date + timedelta(days=7)
    if item.frequency == "monthly":
        next_month = 1 if current_due_date.month == 12 else current_due_date.month + 1
        next_year = current_due_date.year + 1 if current_due_date.month == 12 else current_due_date.year
        last_day = calendar.monthrange(next_year, next_month)[1]
        return date(next_year, next_month, min(item.anchor_day, last_day))
    if item.frequency == "yearly":
        next_year = current_due_date.year + 1
        last_day = calendar.monthrange(next_year, item.anchor_month)[1]
        return date(next_year, item.anchor_month, min(item.anchor_day, last_day))
    raise ValueError(f"Unsupported recurring frequency: {item.frequency}")


def process_due_recurring_expenses(
    db: Session,
    family_id: int,
    fallback_user_id: int,
    today: date | None = None,
) -> dict:
    processing_date = today or app_today()
    schedules = (
        db.query(RecurringExpense)
        .filter(
            RecurringExpense.family_id == family_id,
            RecurringExpense.is_active.is_(True),
            RecurringExpense.next_due_date <= processing_date,
        )
        .order_by(RecurringExpense.next_due_date, RecurringExpense.id)
        .all()
    )

    generated_count = 0
    processed_occurrence_count = 0
    processed_schedule_ids: set[int] = set()
    pending_catch_up = False

    for item in schedules:
        while item.next_due_date <= processing_date:
            if processed_occurrence_count >= MAX_GENERATED_PER_RUN:
                pending_catch_up = True
                break

            due_date = item.next_due_date
            inserted = _insert_occurrence(
                db,
                item,
                due_date,
                item.created_by_user_id or fallback_user_id,
            )
            generated_count += int(inserted)
            processed_occurrence_count += 1
            item.next_due_date = next_occurrence_date(item, due_date)
            processed_schedule_ids.add(item.id)

        if pending_catch_up:
            break

    if any(item.next_due_date <= processing_date for item in schedules):
        pending_catch_up = True

    if processed_schedule_ids:
        db.commit()

    return {
        "generated_count": generated_count,
        "processed_schedule_count": len(processed_schedule_ids),
        "pending_catch_up": pending_catch_up,
    }


def _insert_occurrence(
    db: Session,
    item: RecurringExpense,
    due_date: date,
    user_id: int,
) -> bool:
    values = {
        "family_id": item.family_id,
        "user_id": user_id,
        "category_id": item.category_id,
        "amount_cents": item.amount_cents,
        "description": item.name,
        "merchant": item.merchant,
        "payment_method": item.payment_method,
        "expense_date": due_date,
        "notes": item.notes,
        "is_recurring": True,
        "recurring_expense_id": item.id,
        "recurring_due_date": due_date,
    }
    dialect_name = db.get_bind().dialect.name

    if dialect_name == "postgresql":
        statement = postgresql_insert(Expense).values(**values).on_conflict_do_nothing(
            index_elements=["family_id", "recurring_expense_id", "recurring_due_date"]
        )
        return bool(db.execute(statement).rowcount)
    if dialect_name == "sqlite":
        statement = sqlite_insert(Expense).values(**values).on_conflict_do_nothing(
            index_elements=["family_id", "recurring_expense_id", "recurring_due_date"]
        )
        return bool(db.execute(statement).rowcount)

    existing = db.execute(
        select(Expense.id).where(
            Expense.family_id == item.family_id,
            Expense.recurring_expense_id == item.id,
            Expense.recurring_due_date == due_date,
        )
    ).first()
    if existing:
        return False
    db.add(Expense(**values))
    db.flush()
    return True
