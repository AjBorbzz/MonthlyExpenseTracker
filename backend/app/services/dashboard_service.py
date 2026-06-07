import calendar
from datetime import date, timedelta

from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload

from ..auth import cents_to_pesos
from ..models import BudgetAllocation, Expense, ExpenseCategory, IncomeRecord, RecurringExpense
from .budget_service import budget_vs_actual, month_bounds, spending_velocity

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _sum_income(db: Session, family_id: int, month: int, year: int) -> int:
    return (
        db.query(func.coalesce(func.sum(IncomeRecord.amount_cents), 0))
        .filter(IncomeRecord.family_id == family_id, IncomeRecord.income_month == month, IncomeRecord.income_year == year)
        .scalar()
        or 0
    )


def _sum_expense(db: Session, family_id: int, start: date, end: date) -> int:
    return (
        db.query(func.coalesce(func.sum(Expense.amount_cents), 0))
        .filter(Expense.family_id == family_id, Expense.expense_date >= start, Expense.expense_date < end)
        .scalar()
        or 0
    )


def _monthly_expense_total(db: Session, family_id: int, year: int) -> list[dict]:
    rows = []
    for month in range(1, 13):
        start, end = month_bounds(year, month)
        rows.append({"month": MONTH_NAMES[month - 1], "total": cents_to_pesos(_sum_expense(db, family_id, start, end))})
    return rows


def _savings_trend(db: Session, family_id: int, year: int) -> list[dict]:
    rows = []
    for month in range(1, 13):
        start, end = month_bounds(year, month)
        income_cents = _sum_income(db, family_id, month, year)
        expense_cents = _sum_expense(db, family_id, start, end)
        rows.append({"month": MONTH_NAMES[month - 1], "saved": cents_to_pesos(income_cents - expense_cents)})
    return rows


def _year_to_year_comparison(db: Session, family_id: int, year: int) -> list[dict]:
    rows = []
    for month in range(1, 13):
        current_start, current_end = month_bounds(year, month)
        previous_start, previous_end = month_bounds(year - 1, month)
        rows.append(
            {
                "month": MONTH_NAMES[month - 1],
                "current_year": cents_to_pesos(_sum_expense(db, family_id, current_start, current_end)),
                "previous_year": cents_to_pesos(_sum_expense(db, family_id, previous_start, previous_end)),
            }
        )
    return rows


def _category_breakdown(db: Session, family_id: int, start: date, end: date) -> list[dict]:
    rows = (
        db.query(ExpenseCategory.id, ExpenseCategory.name, ExpenseCategory.color, func.sum(Expense.amount_cents).label("total"))
        .join(Expense, Expense.category_id == ExpenseCategory.id)
        .filter(Expense.family_id == family_id, Expense.expense_date >= start, Expense.expense_date < end)
        .group_by(ExpenseCategory.id)
        .order_by(func.sum(Expense.amount_cents).desc())
        .all()
    )
    return [{"category_id": row.id, "name": row.name, "color": row.color, "total": cents_to_pesos(row.total or 0)} for row in rows]


def _recent_expenses(db: Session, family_id: int) -> list[dict]:
    expenses = (
        db.query(Expense)
        .options(joinedload(Expense.category), joinedload(Expense.user))
        .filter(Expense.family_id == family_id)
        .order_by(Expense.expense_date.desc(), Expense.id.desc())
        .limit(8)
        .all()
    )
    return [
        {
            "id": expense.id,
            "description": expense.description,
            "amount": cents_to_pesos(expense.amount_cents),
            "expense_date": expense.expense_date,
            "category_name": expense.category.name if expense.category else None,
            "user_name": expense.user.full_name if expense.user else None,
        }
        for expense in expenses
    ]


def _recurring_due(db: Session, family_id: int, today: date) -> list[dict]:
    due_until = today + timedelta(days=7)
    rows = (
        db.query(RecurringExpense)
        .options(joinedload(RecurringExpense.category))
        .filter(
            RecurringExpense.family_id == family_id,
            RecurringExpense.is_active.is_(True),
            RecurringExpense.next_due_date >= today,
            RecurringExpense.next_due_date <= due_until,
        )
        .order_by(RecurringExpense.next_due_date)
        .all()
    )
    return [
        {
            "id": item.id,
            "name": item.name,
            "amount": cents_to_pesos(item.amount_cents),
            "next_due_date": item.next_due_date,
            "category_name": item.category.name if item.category else None,
        }
        for item in rows
    ]


def _average_year_expense(db: Session, family_id: int, selected_year: int, selected_month: int, today: date) -> float:
    year_start = date(selected_year, 1, 1)
    year_end = date(selected_year + 1, 1, 1)
    total = _sum_expense(db, family_id, year_start, year_end)
    months_with_data = (
        db.query(func.count(func.distinct(extract("month", Expense.expense_date))))
        .filter(Expense.family_id == family_id, extract("year", Expense.expense_date) == selected_year)
        .scalar()
        or 0
    )
    divisor = today.month if selected_year == today.year else months_with_data or selected_month
    return cents_to_pesos(int(total / max(divisor, 1)))


def _insights(
    db: Session,
    family_id: int,
    month: int,
    year: int,
    total_income_cents: int,
    total_expense_cents: int,
    savings_rate: float,
    budget_rows: list[dict],
    projected_savings_cents: int,
) -> list[str]:
    insights = []
    previous_month = 12 if month == 1 else month - 1
    previous_year = year - 1 if month == 1 else year
    current_start, current_end = month_bounds(year, month)
    previous_start, previous_end = month_bounds(previous_year, previous_month)
    current_categories = _category_breakdown(db, family_id, current_start, current_end)
    previous_categories = {row["name"]: row["total"] for row in _category_breakdown(db, family_id, previous_start, previous_end)}
    for category in current_categories:
        previous = previous_categories.get(category["name"], 0)
        if previous > 0:
            increase = ((category["total"] - previous) / previous) * 100
            if increase >= 20:
                insights.append(f"{category['name']} increased by {round(increase)}% compared to last month.")
    for row in budget_rows:
        if row["status"] == "over_budget":
            insights.append(f"{row['category_name']} is over budget by ₱{abs(row['remaining_budget']):,.2f}.")
    if total_income_cents:
        insights.append(f"You saved {round(savings_rate, 1)}% of your income this month.")
    if projected_savings_cents < 0:
        insights.append("Your projected savings may be negative by month-end.")
    if not insights and total_expense_cents == 0:
        insights.append("No expenses logged for this month yet.")
    return insights[:6]


def _budget_health_score(budget_rows: list[dict], savings_rate: float, projected_savings_cents: int) -> dict:
    score = 100
    score -= sum(12 for row in budget_rows if row["status"] == "over_budget")
    if savings_rate < 10:
        score -= 15
    if projected_savings_cents < 0:
        score -= 20
    score = max(0, min(100, score))
    if score >= 85:
        label = "Excellent"
    elif score >= 70:
        label = "Healthy"
    elif score >= 45:
        label = "Needs Attention"
    else:
        label = "Critical"
    return {"score": score, "label": label}


def dashboard_summary(db: Session, family_id: int, month: int, year: int, today: date | None = None) -> dict:
    today = today or date.today()
    start, end = month_bounds(year, month)
    days_in_month = calendar.monthrange(year, month)[1]
    day_for_projection = today.day if today.year == year and today.month == month else days_in_month

    total_income_cents = _sum_income(db, family_id, month, year)
    total_expense_cents = _sum_expense(db, family_id, start, end)
    total_saved_cents = total_income_cents - total_expense_cents
    savings_rate = round((total_saved_cents / total_income_cents * 100) if total_income_cents else 0, 2)
    average_daily = total_expense_cents / max(day_for_projection, 1)
    projected_expense_cents = int(average_daily * days_in_month)
    projected_savings_cents = total_income_cents - projected_expense_cents
    budget_rows = budget_vs_actual(db, family_id, month, year)
    total_budget_cents = (
        db.query(func.coalesce(func.sum(BudgetAllocation.allocated_amount_cents), 0))
        .filter(BudgetAllocation.family_id == family_id, BudgetAllocation.budget_month == month, BudgetAllocation.budget_year == year)
        .scalar()
        or 0
    )

    overspent = [row for row in budget_rows if row["status"] == "over_budget"]
    remaining_budget = [
        {"category_name": row["category_name"], "remaining_budget": row["remaining_budget"], "rollover_indicator": row["rollover_indicator"]}
        for row in budget_rows
    ]

    return {
        "total_income": cents_to_pesos(total_income_cents),
        "total_expense": cents_to_pesos(total_expense_cents),
        "total_saved": cents_to_pesos(total_saved_cents),
        "savings_rate": savings_rate,
        "average_monthly_expense_current_year": _average_year_expense(db, family_id, year, month, today),
        "monthly_expense_total": _monthly_expense_total(db, family_id, year),
        "savings_trend": _savings_trend(db, family_id, year),
        "year_to_year_comparison": _year_to_year_comparison(db, family_id, year),
        "category_breakdown": _category_breakdown(db, family_id, start, end),
        "budget_vs_actual": budget_rows,
        "top_expense_categories": _category_breakdown(db, family_id, start, end)[:5],
        "recent_expenses": _recent_expenses(db, family_id),
        "recurring_expenses_due_soon": _recurring_due(db, family_id, today),
        "overspent_categories": overspent,
        "remaining_budget_per_category": remaining_budget,
        "projected_month_end_savings": cents_to_pesos(projected_savings_cents),
        "budget_health_score": _budget_health_score(budget_rows, savings_rate, projected_savings_cents),
        "spending_velocity": spending_velocity(total_budget_cents, total_expense_cents, day_for_projection, days_in_month),
        "rule_based_insights": _insights(db, family_id, month, year, total_income_cents, total_expense_cents, savings_rate, budget_rows, projected_savings_cents),
    }
