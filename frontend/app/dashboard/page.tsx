"use client";

import { useEffect, useState } from "react";
import { Activity, Banknote, Download, PiggyBank, ReceiptText, ShieldCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthlyExpenseChart } from "@/components/dashboard/MonthlyExpenseChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { YearComparisonChart } from "@/components/dashboard/YearComparisonChart";
import { BudgetProgressList } from "@/components/dashboard/BudgetProgressList";
import { SavingsTrendChart } from "@/components/dashboard/SavingsTrendChart";
import { API_BASE_URL, api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { DashboardSummary } from "@/lib/types";
import { currentMonth, currentYear, formatPeso } from "@/lib/utils";

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    api
      .get<DashboardSummary>(`/dashboard/summary?month=${month}&year=${year}`)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [month, year]);

  const exportPdf = async () => {
    setExportingPdf(true);
    setError("");
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/dashboard/export.pdf?month=${month}&year=${year}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to export PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `family-expense-report-${year}-${String(month).padStart(2, "0")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <AppShell month={month} year={year} onMonthChange={setMonth} onYearChange={setYear}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Income, spending pace, budgets, and household savings in one place.</p>
        </div>
        <Button variant="outline" onClick={exportPdf} disabled={!summary || exportingPdf}>
          <Download className="h-4 w-4" />
          {exportingPdf ? "Exporting..." : "Export PDF"}
        </Button>
      </div>
      {error ? <Card className="mb-4 border-destructive"><CardContent className="pt-5 text-sm text-destructive">{error}</CardContent></Card> : null}
      {!summary ? (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Total Income" value={formatPeso(summary.total_income)} icon={Banknote} />
            <StatCard title="Total Expense" value={formatPeso(summary.total_expense)} icon={ReceiptText} />
            <StatCard title="Total Saved" value={formatPeso(summary.total_saved)} icon={PiggyBank} />
            <StatCard title="Savings Rate" value={`${summary.savings_rate}%`} icon={TrendingUp} />
            <StatCard title="Health Score" value={`${summary.budget_health_score.score}`} hint={summary.budget_health_score.label} icon={ShieldCheck} />
            <StatCard title="Projected Savings" value={formatPeso(summary.projected_month_end_savings)} hint={summary.spending_velocity.status} icon={Activity} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><CardTitle>Monthly Expense Trend</CardTitle></CardHeader>
              <CardContent><MonthlyExpenseChart data={summary.monthly_expense_total} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
              <CardContent>
                {summary.category_breakdown.length ? <CategoryPieChart data={summary.category_breakdown} /> : <p className="text-sm text-muted-foreground">No expenses for this period.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Year-to-Year Comparison</CardTitle></CardHeader>
              <CardContent><YearComparisonChart data={summary.year_to_year_comparison} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Savings Trend</CardTitle></CardHeader>
              <CardContent><SavingsTrendChart data={summary.savings_trend} /></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
              <CardContent><BudgetProgressList data={summary.budget_vs_actual} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Rule-Based Insights</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {summary.rule_based_insights.map((item) => (
                  <div key={item} className="rounded-md border p-3 text-sm">{item}</div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {summary.recent_expenses.map((expense) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={expense.id}>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{expense.category_name} · {expense.user_name}</p>
                    </div>
                    <span>{formatPeso(expense.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Overspent Categories</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {summary.overspent_categories.length ? summary.overspent_categories.map((row) => (
                  <div key={row.category_id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{row.category_name}</span>
                    <Badge variant="destructive">{formatPeso(Math.abs(row.remaining_budget))}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No overspent categories.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recurring Due Soon</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {summary.recurring_expenses_due_soon.length ? summary.recurring_expenses_due_soon.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.next_due_date}</p>
                    </div>
                    <span>{formatPeso(item.amount)}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nothing due in the next 7 days.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
