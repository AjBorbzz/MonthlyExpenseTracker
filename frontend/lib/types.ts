export type User = {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
};

export type Family = {
  id: number;
  name: string;
  invite_code: string;
  owner_user_id: number;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
  family: Family;
};

export type Category = {
  id: number;
  family_id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  created_at: string;
};

export type Expense = {
  id: number;
  family_id: number;
  user_id: number;
  user_name?: string | null;
  category_id: number;
  category_name?: string | null;
  amount_cents: number;
  amount: number;
  description: string;
  merchant?: string | null;
  payment_method?: string | null;
  expense_date: string;
  notes?: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
};

export type ExpenseImportResult = {
  imported_count: number;
  skipped_count: number;
  error_count: number;
  imported_expenses: Expense[];
  errors: { row: number; message: string }[];
};

export type IncomeRecord = {
  id: number;
  family_id: number;
  user_id: number;
  user_name?: string | null;
  source_name: string;
  amount_cents: number;
  amount: number;
  income_month: number;
  income_year: number;
  notes?: string | null;
  created_at: string;
};

export type BudgetAllocation = {
  id: number;
  family_id: number;
  category_id: number;
  category_name?: string | null;
  budget_month: number;
  budget_year: number;
  allocated_amount_cents: number;
  allocated_amount: number;
  actual_spent: number;
  remaining_budget: number;
  percentage_used: number;
  status: "safe" | "warning" | "over_budget";
  rollover_indicator: "Available" | "Overspent";
  created_at: string;
  updated_at: string;
};

export type RecurringExpense = {
  id: number;
  family_id: number;
  category_id: number;
  category_name?: string | null;
  name: string;
  amount_cents: number;
  amount: number;
  frequency: "monthly" | "weekly" | "yearly";
  next_due_date: string;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
};

export type SavingsGoal = {
  id: number;
  family_id: number;
  name: string;
  target_amount_cents: number;
  target_amount: number;
  current_amount_cents: number;
  current_amount: number;
  progress_percent: number;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
};

export const investmentTypeOptions = [
  { value: "stocks", label: "Stocks" },
  { value: "bonds", label: "Bonds" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "real_estate", label: "Real Estate" },
  { value: "time_deposit", label: "Time Deposit" },
  { value: "retirement", label: "Retirement Fund" },
  { value: "other", label: "Other" }
] as const;

export type InvestmentType = (typeof investmentTypeOptions)[number]["value"];

export type Investment = {
  id: number;
  family_id: number;
  user_id: number;
  user_name?: string | null;
  asset_name: string;
  asset_type: InvestmentType;
  symbol?: string | null;
  quantity_units: number;
  quantity: number;
  invested_amount_cents: number;
  invested_amount: number;
  current_value_cents: number;
  current_value: number;
  gain_loss: number;
  return_percentage: number;
  acquisition_date?: string | null;
  institution?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetVsActual = {
  category_id: number;
  category_name: string;
  allocated_budget: number;
  actual_spent: number;
  remaining_budget: number;
  unused_budget: number;
  percentage_used: number;
  status: "safe" | "warning" | "over_budget";
  rollover_indicator: "Available" | "Overspent";
};

export type DashboardSummary = {
  total_income: number;
  total_expense: number;
  total_saved: number;
  savings_rate: number;
  average_monthly_expense_current_year: number;
  monthly_expense_total: { month: string; total: number }[];
  savings_trend: { month: string; saved: number }[];
  year_to_year_comparison: { month: string; current_year: number; previous_year: number }[];
  category_breakdown: { category_id: number; name: string; color?: string | null; total: number }[];
  budget_vs_actual: BudgetVsActual[];
  top_expense_categories: { category_id: number; name: string; total: number }[];
  recent_expenses: { id: number; description: string; amount: number; expense_date: string; category_name?: string; user_name?: string }[];
  recurring_expenses_due_soon: { id: number; name: string; amount: number; next_due_date: string; category_name?: string }[];
  overspent_categories: BudgetVsActual[];
  remaining_budget_per_category: { category_name: string; remaining_budget: number; rollover_indicator: string }[];
  projected_month_end_savings: number;
  budget_health_score: { score: number; label: string };
  spending_velocity: { expected_spending_by_today: number; actual_spending: number; status: string };
  rule_based_insights: string[];
};
