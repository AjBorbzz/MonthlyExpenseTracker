import os
import unittest
from datetime import date

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Expense, ExpenseCategory, Family, FamilyMember, RecurringExpense, User
from app.services.recurring_service import next_occurrence_date, process_due_recurring_expenses


class RecurringServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.user = User(email="recurring@example.com", full_name="Recurring Tester", password_hash=hash_password("password123"))
        self.db.add(self.user)
        self.db.flush()
        self.family = Family(name="Recurring Family", invite_code="RECUR123", owner_user_id=self.user.id)
        self.db.add(self.family)
        self.db.flush()
        self.db.add(FamilyMember(family_id=self.family.id, user_id=self.user.id, role="owner"))
        self.category = ExpenseCategory(family_id=self.family.id, name="Utilities")
        self.db.add(self.category)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def add_schedule(self, due_date, frequency="monthly", active=True):
        item = RecurringExpense(
            family_id=self.family.id,
            created_by_user_id=self.user.id,
            category_id=self.category.id,
            name="Recurring bill",
            amount_cents=125_050,
            frequency=frequency,
            next_due_date=due_date,
            anchor_day=due_date.day,
            anchor_month=due_date.month,
            merchant="Utility Provider",
            payment_method="Credit Card",
            is_active=active,
        )
        self.db.add(item)
        self.db.commit()
        return item

    def test_monthly_month_end_is_preserved(self):
        item = self.add_schedule(date(2026, 1, 31))

        result = process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 3, 31))

        self.assertEqual(result["generated_count"], 3)
        self.assertEqual(
            [row.expense_date for row in self.db.query(Expense).order_by(Expense.expense_date).all()],
            [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)],
        )
        self.db.refresh(item)
        self.assertEqual(item.next_due_date, date(2026, 4, 30))

    def test_retry_does_not_create_duplicate_occurrences(self):
        item = self.add_schedule(date(2026, 5, 15))
        process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 5, 15))
        item.next_due_date = date(2026, 5, 15)
        self.db.commit()

        result = process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 5, 15))

        self.assertEqual(result["generated_count"], 0)
        self.assertEqual(self.db.query(Expense).count(), 1)
        self.db.refresh(item)
        self.assertEqual(item.next_due_date, date(2026, 6, 15))

    def test_inactive_schedule_is_not_processed(self):
        item = self.add_schedule(date(2026, 1, 1), active=False)

        result = process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 8, 1))

        self.assertEqual(result["generated_count"], 0)
        self.assertEqual(self.db.query(Expense).count(), 0)
        self.db.refresh(item)
        self.assertEqual(item.next_due_date, date(2026, 1, 1))

    def test_weekly_schedule_catches_up(self):
        item = self.add_schedule(date(2026, 7, 1), frequency="weekly")

        result = process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 7, 22))

        self.assertEqual(result["generated_count"], 4)
        self.db.refresh(item)
        self.assertEqual(item.next_due_date, date(2026, 7, 29))

    def test_yearly_february_29_uses_last_valid_day(self):
        item = self.add_schedule(date(2024, 2, 29), frequency="yearly")

        self.assertEqual(next_occurrence_date(item, date(2024, 2, 29)), date(2025, 2, 28))

    def test_generated_expense_copies_schedule_metadata(self):
        item = self.add_schedule(date(2026, 8, 13))

        process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 8, 13))
        expense = self.db.query(Expense).one()

        self.assertEqual(expense.recurring_expense_id, item.id)
        self.assertEqual(expense.recurring_due_date, date(2026, 8, 13))
        self.assertEqual(expense.user_id, self.user.id)
        self.assertEqual(expense.merchant, "Utility Provider")
        self.assertEqual(expense.payment_method, "Credit Card")
        self.assertTrue(expense.is_recurring)

    def test_processing_is_scoped_to_one_family(self):
        self.add_schedule(date(2026, 8, 13))
        other_user = User(email="other@example.com", full_name="Other User", password_hash=hash_password("password123"))
        self.db.add(other_user)
        self.db.flush()
        other_family = Family(name="Other Family", invite_code="OTHER123", owner_user_id=other_user.id)
        self.db.add(other_family)
        self.db.flush()
        other_category = ExpenseCategory(family_id=other_family.id, name="Other")
        self.db.add(other_category)
        self.db.flush()
        self.db.add(
            RecurringExpense(
                family_id=other_family.id,
                created_by_user_id=other_user.id,
                category_id=other_category.id,
                name="Other bill",
                amount_cents=5_000,
                frequency="monthly",
                next_due_date=date(2026, 8, 13),
                anchor_day=13,
                anchor_month=8,
                is_active=True,
            )
        )
        self.db.commit()

        process_due_recurring_expenses(self.db, self.family.id, self.user.id, date(2026, 8, 13))

        expenses = self.db.query(Expense).all()
        self.assertEqual(len(expenses), 1)
        self.assertEqual(expenses[0].family_id, self.family.id)


if __name__ == "__main__":
    unittest.main()
