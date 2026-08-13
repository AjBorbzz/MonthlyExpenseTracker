from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class MoneyModel(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def empty_string_to_none(cls, value):
        return None if value == "" else value


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FamilyRead(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_user_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    family_name: str | None = Field(default=None, max_length=255)
    invite_code: str | None = Field(default=None, max_length=24)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
    family: FamilyRead


class MeResponse(BaseModel):
    user: UserRead
    family: FamilyRead
    role: str


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=64)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None


class CategoryRead(CategoryBase):
    id: int
    family_id: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(MoneyModel):
    category_id: int
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=1, max_length=255)
    merchant: str | None = Field(default=None, max_length=255)
    payment_method: str | None = Field(default=None, max_length=80)
    expense_date: date
    notes: str | None = None
    is_recurring: bool = False


class ExpenseUpdate(MoneyModel):
    category_id: int | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=1, max_length=255)
    merchant: str | None = Field(default=None, max_length=255)
    payment_method: str | None = Field(default=None, max_length=80)
    expense_date: date | None = None
    notes: str | None = None
    is_recurring: bool | None = None


class ExpenseRead(BaseModel):
    id: int
    family_id: int
    user_id: int
    user_name: str | None = None
    category_id: int
    category_name: str | None = None
    amount_cents: int
    amount: float
    description: str
    merchant: str | None
    payment_method: str | None
    expense_date: date
    notes: str | None
    is_recurring: bool
    recurring_expense_id: int | None = None
    recurring_due_date: date | None = None
    created_at: datetime
    updated_at: datetime


class ExpenseImportRowError(BaseModel):
    row: int
    message: str


class ExpenseImportResult(BaseModel):
    imported_count: int
    skipped_count: int
    error_count: int
    imported_expenses: list[ExpenseRead]
    errors: list[ExpenseImportRowError]


class IncomeCreate(MoneyModel):
    source_name: str = Field(min_length=1, max_length=180)
    amount: Decimal = Field(gt=0)
    income_month: int = Field(ge=1, le=12)
    income_year: int = Field(ge=2000, le=2100)
    notes: str | None = None


class IncomeUpdate(MoneyModel):
    source_name: str | None = Field(default=None, min_length=1, max_length=180)
    amount: Decimal | None = Field(default=None, gt=0)
    income_month: int | None = Field(default=None, ge=1, le=12)
    income_year: int | None = Field(default=None, ge=2000, le=2100)
    notes: str | None = None


class IncomeRead(BaseModel):
    id: int
    family_id: int
    user_id: int
    user_name: str | None = None
    source_name: str
    amount_cents: int
    amount: float
    income_month: int
    income_year: int
    notes: str | None
    created_at: datetime


class BudgetCreate(MoneyModel):
    category_id: int
    budget_month: int = Field(ge=1, le=12)
    budget_year: int = Field(ge=2000, le=2100)
    allocated_amount: Decimal = Field(ge=0)


class BudgetUpdate(MoneyModel):
    category_id: int | None = None
    budget_month: int | None = Field(default=None, ge=1, le=12)
    budget_year: int | None = Field(default=None, ge=2000, le=2100)
    allocated_amount: Decimal | None = Field(default=None, ge=0)


class BudgetRead(BaseModel):
    id: int
    family_id: int
    category_id: int
    category_name: str | None = None
    budget_month: int
    budget_year: int
    allocated_amount_cents: int
    allocated_amount: float
    actual_spent: float = 0
    remaining_budget: float = 0
    percentage_used: float = 0
    status: str = "safe"
    rollover_indicator: str = "Available"
    created_at: datetime
    updated_at: datetime


class RecurringCreate(MoneyModel):
    category_id: int
    name: str = Field(min_length=1, max_length=180)
    amount: Decimal = Field(gt=0)
    frequency: Literal["monthly", "weekly", "yearly"]
    next_due_date: date = Field(ge=date(2000, 1, 1), le=date(2100, 12, 31))
    merchant: str | None = Field(default=None, max_length=255)
    payment_method: str | None = Field(default=None, max_length=80)
    is_active: bool = True
    notes: str | None = None


class RecurringUpdate(MoneyModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=180)
    amount: Decimal | None = Field(default=None, gt=0)
    frequency: Literal["monthly", "weekly", "yearly"] | None = None
    next_due_date: date | None = Field(default=None, ge=date(2000, 1, 1), le=date(2100, 12, 31))
    merchant: str | None = Field(default=None, max_length=255)
    payment_method: str | None = Field(default=None, max_length=80)
    is_active: bool | None = None
    notes: str | None = None


class RecurringRead(BaseModel):
    id: int
    family_id: int
    created_by_user_id: int
    created_by_user_name: str | None = None
    category_id: int
    category_name: str | None = None
    name: str
    amount_cents: int
    amount: float
    frequency: str
    next_due_date: date
    merchant: str | None
    payment_method: str | None
    is_active: bool
    notes: str | None
    last_generated_date: date | None = None
    created_at: datetime


class RecurringProcessResult(BaseModel):
    generated_count: int
    processed_schedule_count: int
    pending_catch_up: bool


class SavingsGoalCreate(MoneyModel):
    name: str = Field(min_length=1, max_length=180)
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0)
    target_date: date | None = None


class SavingsGoalUpdate(MoneyModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    target_amount: Decimal | None = Field(default=None, gt=0)
    current_amount: Decimal | None = Field(default=None, ge=0)
    target_date: date | None = None


class SavingsGoalRead(BaseModel):
    id: int
    family_id: int
    name: str
    target_amount_cents: int
    target_amount: float
    current_amount_cents: int
    current_amount: float
    progress_percent: float
    target_date: date | None
    created_at: datetime
    updated_at: datetime


InvestmentType = Literal[
    "stocks",
    "bonds",
    "mutual_fund",
    "etf",
    "crypto",
    "real_estate",
    "time_deposit",
    "retirement",
    "other",
]

MAX_INVESTMENT_QUANTITY = Decimal("92233720368.54775807")
MAX_INVESTMENT_AMOUNT = Decimal("92233720368547758.07")


class InvestmentCreate(MoneyModel):
    asset_name: str = Field(min_length=1, max_length=180)
    asset_type: InvestmentType
    symbol: str | None = Field(default=None, max_length=24)
    quantity: Decimal = Field(default=Decimal("0"), ge=0, le=MAX_INVESTMENT_QUANTITY, decimal_places=8)
    invested_amount: Decimal = Field(gt=0, le=MAX_INVESTMENT_AMOUNT)
    current_value: Decimal | None = Field(default=None, ge=0, le=MAX_INVESTMENT_AMOUNT)
    acquisition_date: date | None = None
    institution: str | None = Field(default=None, max_length=180)
    notes: str | None = None


class InvestmentUpdate(MoneyModel):
    asset_name: str | None = Field(default=None, min_length=1, max_length=180)
    asset_type: InvestmentType | None = None
    symbol: str | None = Field(default=None, max_length=24)
    quantity: Decimal | None = Field(default=None, ge=0, le=MAX_INVESTMENT_QUANTITY, decimal_places=8)
    invested_amount: Decimal | None = Field(default=None, gt=0, le=MAX_INVESTMENT_AMOUNT)
    current_value: Decimal | None = Field(default=None, ge=0, le=MAX_INVESTMENT_AMOUNT)
    acquisition_date: date | None = None
    institution: str | None = Field(default=None, max_length=180)
    notes: str | None = None


class InvestmentRead(BaseModel):
    id: int
    family_id: int
    user_id: int
    user_name: str | None = None
    asset_name: str
    asset_type: InvestmentType
    symbol: str | None
    quantity_units: int
    quantity: float
    invested_amount_cents: int
    invested_amount: float
    current_value_cents: int
    current_value: float
    gain_loss: float
    return_percentage: float
    acquisition_date: date | None
    institution: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
