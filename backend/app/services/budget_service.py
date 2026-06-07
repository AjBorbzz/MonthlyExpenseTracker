from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import cents_to_pesos
from ..models import BudgetAllocation, Expense


def month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    end = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
    return start, end


def budget_vs_actual(db: Session, family_id: int, month: int, year: int) -> list[dict]:
    start, end = month_bounds(year, month)
    budgets = (
        db.query(BudgetAllocation)
        .filter(
            BudgetAllocation.family_id == family_id,
            BudgetAllocation.budget_month == month,
            BudgetAllocation.budget_year == year,
        )
        .all()
    )
    rows = []
    for budget in budgets:
        actual_cents = (
            db.query(func.coalesce(func.sum(Expense.amount_cents), 0))
            .filter(
                Expense.family_id == family_id,
                Expense.category_id == budget.category_id,
                Expense.expense_date >= start,
                Expense.expense_date < end,
            )
            .scalar()
            or 0
        )
        allocated = budget.allocated_amount_cents
        remaining = allocated - actual_cents
        percentage = round((actual_cents / allocated * 100) if allocated else 0, 2)
        if percentage > 100:
            status = "over_budget"
        elif percentage >= 80:
            status = "warning"
        else:
            status = "safe"
        rows.append(
            {
                "category_id": budget.category_id,
                "category_name": budget.category.name if budget.category else "Uncategorized",
                "allocated_budget": cents_to_pesos(allocated),
                "actual_spent": cents_to_pesos(actual_cents),
                "remaining_budget": cents_to_pesos(remaining),
                "unused_budget": cents_to_pesos(remaining),
                "percentage_used": percentage,
                "status": status,
                "rollover_indicator": "Available" if remaining >= 0 else "Overspent",
            }
        )
    return rows


def spending_velocity(total_budget_cents: int, actual_spending_cents: int, day: int, days_in_month: int) -> dict:
    expected = int(total_budget_cents * (day / days_in_month)) if days_in_month else 0
    return {
        "expected_spending_by_today": cents_to_pesos(expected),
        "actual_spending": cents_to_pesos(actual_spending_cents),
        "status": "Ahead of budget pace" if actual_spending_cents > expected else "Within budget pace",
    }
