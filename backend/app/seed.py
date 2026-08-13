from datetime import date, timedelta

from .auth import hash_password, pesos_to_cents
from .database import Base, SessionLocal, engine, run_schema_migrations
from .models import (
    BudgetAllocation,
    Expense,
    ExpenseCategory,
    Family,
    FamilyMember,
    IncomeRecord,
    Investment,
    RecurringExpense,
    SavingsGoal,
    User,
)

DEFAULT_CATEGORIES = [
    ("Groceries", "#16a34a", "shopping-cart"),
    ("Transportation", "#2563eb", "car"),
    ("Rent", "#9333ea", "home"),
    ("Utilities", "#f59e0b", "bolt"),
    ("Internet", "#0891b2", "wifi"),
    ("Education", "#7c3aed", "book-open"),
    ("Health", "#dc2626", "heart-pulse"),
    ("Insurance", "#0f766e", "shield"),
    ("Debt Payment", "#be123c", "credit-card"),
    ("Entertainment", "#db2777", "film"),
    ("Savings", "#65a30d", "piggy-bank"),
    ("Emergency Fund", "#ea580c", "briefcase"),
]


def add_demo_investments(db, family_id: int, user_id: int, today: date):
    db.add_all(
        [
            Investment(
                family_id=family_id,
                user_id=user_id,
                asset_name="Ayala Corporation",
                asset_type="stocks",
                symbol="AC",
                quantity_units=150 * 100_000_000,
                invested_amount_cents=pesos_to_cents(93000),
                current_value_cents=pesos_to_cents(105750),
                acquisition_date=date(today.year - 1, 8, 15),
                institution="COL Financial",
            ),
            Investment(
                family_id=family_id,
                user_id=user_id,
                asset_name="Philippine Equity Index Fund",
                asset_type="mutual_fund",
                quantity_units=250 * 100_000_000,
                invested_amount_cents=pesos_to_cents(125000),
                current_value_cents=pesos_to_cents(138500),
                acquisition_date=date(today.year - 2, 3, 10),
                institution="BPI Investment Management",
            ),
            Investment(
                family_id=family_id,
                user_id=user_id,
                asset_name="12-Month Time Deposit",
                asset_type="time_deposit",
                quantity_units=0,
                invested_amount_cents=pesos_to_cents(200000),
                current_value_cents=pesos_to_cents(207000),
                acquisition_date=date(today.year, 1, 20),
                institution="BDO",
                notes="Value includes accrued interest entered manually.",
            ),
        ]
    )


def seed():
    Base.metadata.create_all(bind=engine)
    run_schema_migrations()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo@example.com").first()
        if existing:
            membership = db.query(FamilyMember).filter(FamilyMember.user_id == existing.id).first()
            if membership and not db.query(Investment).filter(Investment.family_id == membership.family_id).first():
                add_demo_investments(db, membership.family_id, existing.id, date.today())
                db.commit()
                print("Demo investments added to the existing demo workspace.")
            else:
                print("Demo data already exists.")
            return

        user = User(email="demo@example.com", full_name="Demo Parent", password_hash=hash_password("password123"))
        db.add(user)
        db.flush()

        family = Family(name="Santos Family", invite_code="DEMO2026", owner_user_id=user.id)
        db.add(family)
        db.flush()
        db.add(FamilyMember(family_id=family.id, user_id=user.id, role="owner"))

        categories = {}
        for name, color, icon in DEFAULT_CATEGORIES:
            category = ExpenseCategory(family_id=family.id, name=name, color=color, icon=icon)
            db.add(category)
            db.flush()
            categories[name] = category

        today = date.today()
        for month_offset in range(0, 15):
            month = today.month - month_offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            db.add(
                IncomeRecord(
                    family_id=family.id,
                    user_id=user.id,
                    source_name="Salary",
                    amount_cents=pesos_to_cents(115000),
                    income_month=month,
                    income_year=year,
                )
            )
            db.add(
                IncomeRecord(
                    family_id=family.id,
                    user_id=user.id,
                    source_name="Freelance",
                    amount_cents=pesos_to_cents(12000 if month % 2 == 0 else 7000),
                    income_month=month,
                    income_year=year,
                )
            )
            sample_expenses = [
                ("Weekly grocery run", "Groceries", 14500 + month_offset * 80, 3, "Landmark"),
                ("Fuel and commute", "Transportation", 7200 + month_offset * 40, 8, "Shell"),
                ("Monthly rent", "Rent", 32000, 1, "Property Manager"),
                ("Electricity and water", "Utilities", 6800 + month_offset * 30, 12, "Meralco"),
                ("Fiber internet", "Internet", 1899, 15, "Converge"),
                ("Clinic and medicine", "Health", 3500 if month % 3 == 0 else 900, 19, "Watsons"),
                ("Movie and dinner", "Entertainment", 4200 if month % 2 == 0 else 1800, 24, "Mall"),
                ("Emergency fund transfer", "Emergency Fund", 6000, 27, "Bank transfer"),
            ]
            for description, category_name, amount, day, merchant in sample_expenses:
                last_day = 28 if month == 2 else 30
                db.add(
                    Expense(
                        family_id=family.id,
                        user_id=user.id,
                        category_id=categories[category_name].id,
                        amount_cents=pesos_to_cents(amount),
                        description=description,
                        merchant=merchant,
                        payment_method="Card" if category_name != "Rent" else "Bank Transfer",
                        expense_date=date(year, month, min(day, last_day)),
                        is_recurring=category_name in {"Rent", "Internet"},
                    )
                )

        for category_name, amount in [
            ("Groceries", 52000),
            ("Transportation", 18000),
            ("Rent", 32000),
            ("Utilities", 9500),
            ("Internet", 2000),
            ("Health", 7000),
            ("Entertainment", 6000),
            ("Emergency Fund", 10000),
        ]:
            db.add(
                BudgetAllocation(
                    family_id=family.id,
                    category_id=categories[category_name].id,
                    budget_month=today.month,
                    budget_year=today.year,
                    allocated_amount_cents=pesos_to_cents(amount),
                )
            )

        db.add_all(
            [
                RecurringExpense(
                    family_id=family.id,
                    created_by_user_id=user.id,
                    category_id=categories["Rent"].id,
                    name="Rent",
                    amount_cents=pesos_to_cents(32000),
                    frequency="monthly",
                    next_due_date=today + timedelta(days=3),
                    anchor_day=(today + timedelta(days=3)).day,
                    anchor_month=(today + timedelta(days=3)).month,
                    is_active=True,
                ),
                RecurringExpense(
                    family_id=family.id,
                    created_by_user_id=user.id,
                    category_id=categories["Internet"].id,
                    name="Internet subscription",
                    amount_cents=pesos_to_cents(1899),
                    frequency="monthly",
                    next_due_date=today + timedelta(days=6),
                    anchor_day=(today + timedelta(days=6)).day,
                    anchor_month=(today + timedelta(days=6)).month,
                    is_active=True,
                ),
                RecurringExpense(
                    family_id=family.id,
                    created_by_user_id=user.id,
                    category_id=categories["Insurance"].id,
                    name="Life insurance",
                    amount_cents=pesos_to_cents(5500),
                    frequency="monthly",
                    next_due_date=today + timedelta(days=13),
                    anchor_day=(today + timedelta(days=13)).day,
                    anchor_month=(today + timedelta(days=13)).month,
                    is_active=True,
                ),
            ]
        )
        db.add_all(
            [
                SavingsGoal(
                    family_id=family.id,
                    name="Emergency Fund",
                    target_amount_cents=pesos_to_cents(300000),
                    current_amount_cents=pesos_to_cents(142000),
                    target_date=date(today.year + 1, 6, 30),
                ),
                SavingsGoal(
                    family_id=family.id,
                    name="Family Vacation",
                    target_amount_cents=pesos_to_cents(120000),
                    current_amount_cents=pesos_to_cents(36500),
                    target_date=date(today.year, 12, 15),
                ),
            ]
        )
        add_demo_investments(db, family.id, user.id, today)
        db.commit()
        print("Seed complete. Demo login: demo@example.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
