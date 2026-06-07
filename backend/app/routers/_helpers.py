from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import cents_to_pesos
from ..models import BudgetAllocation, Expense, ExpenseCategory, IncomeRecord, RecurringExpense, SavingsGoal


def ensure_category(db: Session, category_id: int, family_id: int) -> ExpenseCategory:
    category = (
        db.query(ExpenseCategory)
        .filter(ExpenseCategory.id == category_id, ExpenseCategory.family_id == family_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def expense_to_dict(expense: Expense) -> dict:
    return {
        "id": expense.id,
        "family_id": expense.family_id,
        "user_id": expense.user_id,
        "user_name": expense.user.full_name if expense.user else None,
        "category_id": expense.category_id,
        "category_name": expense.category.name if expense.category else None,
        "amount_cents": expense.amount_cents,
        "amount": cents_to_pesos(expense.amount_cents),
        "description": expense.description,
        "merchant": expense.merchant,
        "payment_method": expense.payment_method,
        "expense_date": expense.expense_date,
        "notes": expense.notes,
        "is_recurring": expense.is_recurring,
        "created_at": expense.created_at,
        "updated_at": expense.updated_at,
    }


def income_to_dict(income: IncomeRecord) -> dict:
    return {
        "id": income.id,
        "family_id": income.family_id,
        "user_id": income.user_id,
        "user_name": income.user.full_name if income.user else None,
        "source_name": income.source_name,
        "amount_cents": income.amount_cents,
        "amount": cents_to_pesos(income.amount_cents),
        "income_month": income.income_month,
        "income_year": income.income_year,
        "notes": income.notes,
        "created_at": income.created_at,
    }


def budget_status(allocated_cents: int, actual_cents: int) -> tuple[float, str, str]:
    percentage = (actual_cents / allocated_cents * 100) if allocated_cents else 0
    if percentage > 100:
        status_label = "over_budget"
    elif percentage >= 80:
        status_label = "warning"
    else:
        status_label = "safe"
    rollover = "Available" if allocated_cents - actual_cents >= 0 else "Overspent"
    return round(percentage, 2), status_label, rollover


def budget_to_dict(db: Session, budget: BudgetAllocation) -> dict:
    start = date(budget.budget_year, budget.budget_month, 1)
    end = date(budget.budget_year + (1 if budget.budget_month == 12 else 0), 1 if budget.budget_month == 12 else budget.budget_month + 1, 1)
    actual_cents = (
        db.query(func.coalesce(func.sum(Expense.amount_cents), 0))
        .filter(
            Expense.family_id == budget.family_id,
            Expense.category_id == budget.category_id,
            Expense.expense_date >= start,
            Expense.expense_date < end,
        )
        .scalar()
        or 0
    )
    percentage, status_label, rollover = budget_status(budget.allocated_amount_cents, actual_cents)
    return {
        "id": budget.id,
        "family_id": budget.family_id,
        "category_id": budget.category_id,
        "category_name": budget.category.name if budget.category else None,
        "budget_month": budget.budget_month,
        "budget_year": budget.budget_year,
        "allocated_amount_cents": budget.allocated_amount_cents,
        "allocated_amount": cents_to_pesos(budget.allocated_amount_cents),
        "actual_spent": cents_to_pesos(actual_cents),
        "remaining_budget": cents_to_pesos(budget.allocated_amount_cents - actual_cents),
        "percentage_used": percentage,
        "status": status_label,
        "rollover_indicator": rollover,
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
    }


def recurring_to_dict(item: RecurringExpense) -> dict:
    return {
        "id": item.id,
        "family_id": item.family_id,
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else None,
        "name": item.name,
        "amount_cents": item.amount_cents,
        "amount": cents_to_pesos(item.amount_cents),
        "frequency": item.frequency,
        "next_due_date": item.next_due_date,
        "is_active": item.is_active,
        "notes": item.notes,
        "created_at": item.created_at,
    }


def goal_to_dict(goal: SavingsGoal) -> dict:
    progress = (goal.current_amount_cents / goal.target_amount_cents * 100) if goal.target_amount_cents else 0
    return {
        "id": goal.id,
        "family_id": goal.family_id,
        "name": goal.name,
        "target_amount_cents": goal.target_amount_cents,
        "target_amount": cents_to_pesos(goal.target_amount_cents),
        "current_amount_cents": goal.current_amount_cents,
        "current_amount": cents_to_pesos(goal.current_amount_cents),
        "progress_percent": round(min(progress, 100), 2),
        "target_date": goal.target_date,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }
