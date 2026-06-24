"use client";

import { Calculator, CircleAlert, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { BudgetAllocation, Expense, IncomeRecord } from "@/lib/types";
import { currentMonth, currentYear, formatPeso } from "@/lib/utils";

type SheetKey = "overview" | "expenses" | "income" | "budgets";

type WorkbookCell = {
  value: string;
  align?: "left" | "right" | "center";
  tone?: "muted" | "income" | "expense" | "warning" | "success";
};

type WorkbookRow = {
  cells: WorkbookCell[];
  isHeader?: boolean;
  isTotal?: boolean;
};

type WorkbookSheet = {
  key: SheetKey;
  label: string;
  columns: string[];
  rows: WorkbookRow[];
};

const sheetOrder: { key: SheetKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "expenses", label: "Expenses" },
  { key: "income", label: "Income" },
  { key: "budgets", label: "Budgets" }
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cell(value: string | number, align: WorkbookCell["align"] = "left", tone?: WorkbookCell["tone"]): WorkbookCell {
  return { value: String(value), align, tone };
}

function moneyCell(value: number, tone?: WorkbookCell["tone"]): WorkbookCell {
  return cell(formatPeso(value), "right", tone);
}

function getColumnLabel(index: number) {
  let label = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

function buildSheets(expenses: Expense[], income: IncomeRecord[], budgets: BudgetAllocation[], month: number, year: number): WorkbookSheet[] {
  const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);
  const totalBudget = budgets.reduce((sum, row) => sum + row.allocated_amount, 0);
  const totalActualBudgetSpend = budgets.reduce((sum, row) => sum + row.actual_spent, 0);
  const saved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;
  const remainingBudget = totalBudget - totalActualBudgetSpend;
  const overBudgetCount = budgets.filter((budget) => budget.status === "over_budget").length;

  const overviewRows: WorkbookRow[] = [
    { isHeader: true, cells: [cell("Metric"), cell("Formula"), cell("Value", "right"), cell("Signal")] },
    { cells: [cell("Month"), cell("selected period"), cell(`${monthNames[month - 1]} ${year}`, "right"), cell("Active")] },
    { cells: [cell("Total income"), cell("SUM(Income!Amount)"), moneyCell(totalIncome, "income"), cell(`${income.length} records`)] },
    { cells: [cell("Total expenses"), cell("SUM(Expenses!Amount)"), moneyCell(totalExpenses, "expense"), cell(`${expenses.length} records`)] },
    { cells: [cell("Net savings"), cell("Income - Expenses"), moneyCell(saved, saved >= 0 ? "success" : "warning"), cell(saved >= 0 ? "Positive" : "Negative")] },
    { cells: [cell("Savings rate"), cell("Net savings / Income"), cell(`${savingsRate.toFixed(1)}%`, "right", savingsRate >= 10 ? "success" : "warning"), cell(savingsRate >= 10 ? "On track" : "Review")] },
    { cells: [cell("Allocated budget"), cell("SUM(Budgets!Allocated)"), moneyCell(totalBudget), cell(`${budgets.length} categories`)] },
    { cells: [cell("Budget remaining"), cell("Allocated - Actual"), moneyCell(remainingBudget, remainingBudget >= 0 ? "success" : "warning"), cell(remainingBudget >= 0 ? "Available" : "Overspent")] },
    { cells: [cell("Overspent categories"), cell("COUNTIF(Budgets!Status, Over)"), cell(overBudgetCount, "right", overBudgetCount ? "warning" : "success"), cell(overBudgetCount ? "Needs attention" : "Clear")] }
  ];

  const expenseRows: WorkbookRow[] = [
    { isHeader: true, cells: [cell("Date"), cell("Category"), cell("Description"), cell("Merchant"), cell("Payment"), cell("Added by"), cell("Amount", "right")] },
    ...expenses.map((expense) => ({
      cells: [
        cell(expense.expense_date),
        cell(expense.category_name || "Uncategorized"),
        cell(expense.description),
        cell(expense.merchant || "-"),
        cell(expense.payment_method || "-"),
        cell(expense.user_name || "-"),
        moneyCell(expense.amount, "expense")
      ]
    })),
    { isTotal: true, cells: [cell("Total"), cell(""), cell(""), cell(""), cell(""), cell(`${expenses.length} rows`), moneyCell(totalExpenses, "expense")] }
  ];

  const incomeRows: WorkbookRow[] = [
    { isHeader: true, cells: [cell("Source"), cell("Month"), cell("Year"), cell("Added by"), cell("Notes"), cell("Amount", "right")] },
    ...income.map((row) => ({
      cells: [
        cell(row.source_name),
        cell(monthNames[row.income_month - 1] || row.income_month),
        cell(row.income_year, "center"),
        cell(row.user_name || "-"),
        cell(row.notes || "-"),
        moneyCell(row.amount, "income")
      ]
    })),
    { isTotal: true, cells: [cell("Total"), cell(""), cell(""), cell(""), cell(`${income.length} rows`), moneyCell(totalIncome, "income")] }
  ];

  const budgetRows: WorkbookRow[] = [
    { isHeader: true, cells: [cell("Category"), cell("Allocated", "right"), cell("Actual", "right"), cell("Remaining", "right"), cell("Used", "right"), cell("Status"), cell("Rollover")] },
    ...budgets.map((budget) => ({
      cells: [
        cell(budget.category_name || "Category"),
        moneyCell(budget.allocated_amount),
        moneyCell(budget.actual_spent, "expense"),
        moneyCell(budget.remaining_budget, budget.remaining_budget >= 0 ? "success" : "warning"),
        cell(`${budget.percentage_used.toFixed(1)}%`, "right", budget.percentage_used > 100 ? "warning" : undefined),
        cell(budget.status.replace("_", " ")),
        cell(budget.rollover_indicator, "center", budget.rollover_indicator === "Overspent" ? "warning" : "success")
      ]
    })),
    { isTotal: true, cells: [cell("Total"), moneyCell(totalBudget), moneyCell(totalActualBudgetSpend, "expense"), moneyCell(remainingBudget, remainingBudget >= 0 ? "success" : "warning"), cell(""), cell(""), cell("")] }
  ];

  return [
    { key: "overview", label: "Overview", columns: ["Metric", "Formula", "Value", "Signal"], rows: overviewRows },
    { key: "expenses", label: "Expenses", columns: ["Date", "Category", "Description", "Merchant", "Payment", "Added by", "Amount"], rows: expenseRows },
    { key: "income", label: "Income", columns: ["Source", "Month", "Year", "Added by", "Notes", "Amount"], rows: incomeRows },
    { key: "budgets", label: "Budgets", columns: ["Category", "Allocated", "Actual", "Remaining", "Used", "Status", "Rollover"], rows: budgetRows }
  ];
}

function getCellClass(tone: WorkbookCell["tone"]) {
  if (tone === "income") return "text-primary";
  if (tone === "expense") return "text-destructive";
  if (tone === "warning") return "text-amber-700";
  if (tone === "success") return "text-emerald-700";
  if (tone === "muted") return "text-muted-foreground";
  return "";
}

export default function SpreadsheetPage() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [activeSheet, setActiveSheet] = useState<SheetKey>("overview");
  const [selectedCell, setSelectedCell] = useState({ row: 1, column: 1 });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [expenseRows, incomeRows, budgetRows] = await Promise.all([
        api.get<Expense[]>(`/expenses?month=${month}&year=${year}`),
        api.get<IncomeRecord[]>(`/income?month=${month}&year=${year}`),
        api.get<BudgetAllocation[]>(`/budgets?month=${month}&year=${year}`)
      ]);
      setExpenses(expenseRows);
      setIncome(incomeRows);
      setBudgets(budgetRows);
      setSelectedCell({ row: 1, column: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load spreadsheet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  const sheets = useMemo(() => buildSheets(expenses, income, budgets, month, year), [expenses, income, budgets, month, year]);
  const sheet = sheets.find((item) => item.key === activeSheet) ?? sheets[0];
  const selectedValue = sheet.rows[selectedCell.row - 1]?.cells[selectedCell.column - 1]?.value ?? "";
  const rowCount = sheet.rows.length;
  const columnCount = sheet.columns.length;

  return (
    <AppShell month={month} year={year} onMonthChange={setMonth} onYearChange={setYear}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Spreadsheet</h1>
          <p className="text-sm text-muted-foreground">Workbook view for income, expenses, budgets, and monthly totals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{rowCount} rows</Badge>
          <Badge variant="secondary">{columnCount} columns</Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="text-2xl font-semibold text-primary">{formatPeso(income.reduce((sum, row) => sum + row.amount, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-2xl font-semibold text-destructive">{formatPeso(expenses.reduce((sum, row) => sum + row.amount, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Net</p>
            <p className="text-2xl font-semibold">{formatPeso(income.reduce((sum, row) => sum + row.amount, 0) - expenses.reduce((sum, row) => sum + row.amount, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="mb-4 border-destructive">
          <CardContent className="flex items-center gap-2 pt-5 text-sm text-destructive">
            <CircleAlert className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Family workbook</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            <span>{monthNames[month - 1]} {year}</span>
          </div>
        </div>

        <div className="flex border-b bg-card px-2 pt-2">
          {sheetOrder.map((item) => {
            const active = activeSheet === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveSheet(item.key);
                  setSelectedCell({ row: 1, column: 1 });
                }}
                className={`h-9 rounded-t-md border px-4 text-sm font-medium transition ${
                  active ? "border-b-card bg-card text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[5.5rem_1fr] border-b bg-white">
          <div className="border-r bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            {getColumnLabel(selectedCell.column - 1)}
            {selectedCell.row}
          </div>
          <div className="min-w-0 px-3 py-2 text-sm">
            <span className="mr-2 text-xs font-semibold text-muted-foreground">fx</span>
            <span className="break-words">{selectedValue || "-"}</span>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="max-h-[62vh] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 h-9 w-12 border-b border-r bg-muted text-xs font-semibold text-muted-foreground" />
                  {sheet.columns.map((_, index) => (
                    <th key={index} className="h-9 min-w-36 border-b border-r bg-muted px-3 text-center text-xs font-semibold text-muted-foreground">
                      {getColumnLabel(index)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <th className="sticky left-0 border-r bg-muted/70 px-2 text-xs font-medium text-muted-foreground">1</th>
                    <td className="h-20 border-b border-r px-3 text-muted-foreground" colSpan={sheet.columns.length}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading workbook data...
                      </span>
                    </td>
                  </tr>
                ) : sheet.rows.length ? (
                  sheet.rows.map((row, rowIndex) => (
                    <tr key={`${sheet.key}-${rowIndex}`} className={row.isHeader ? "font-semibold" : row.isTotal ? "font-semibold" : ""}>
                      <th className="sticky left-0 z-10 h-10 border-b border-r bg-muted/70 px-2 text-xs font-medium text-muted-foreground">
                        {rowIndex + 1}
                      </th>
                      {sheet.columns.map((_, columnIndex) => {
                        const currentCell = row.cells[columnIndex] ?? cell("");
                        const selected = selectedCell.row === rowIndex + 1 && selectedCell.column === columnIndex + 1;
                        return (
                          <td
                            key={`${sheet.key}-${rowIndex}-${columnIndex}`}
                            onClick={() => setSelectedCell({ row: rowIndex + 1, column: columnIndex + 1 })}
                            className={`h-10 min-w-36 cursor-cell border-b border-r px-3 align-middle ${row.isHeader ? "bg-muted/70" : row.isTotal ? "bg-accent/15" : "bg-white"} ${
                              selected ? "outline outline-2 outline-primary outline-offset-[-2px]" : ""
                            } ${currentCell.align === "right" ? "text-right" : currentCell.align === "center" ? "text-center" : "text-left"} ${getCellClass(currentCell.tone)}`}
                          >
                            <span className="line-clamp-2">{currentCell.value}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <th className="sticky left-0 border-r bg-muted/70 px-2 text-xs font-medium text-muted-foreground">1</th>
                    <td className="h-20 border-b border-r px-3 text-muted-foreground" colSpan={sheet.columns.length}>
                      No rows for this sheet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
