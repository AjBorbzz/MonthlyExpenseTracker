"use client";

import { CalendarPlus, Download, Edit, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyExpenseEntryForm } from "@/components/forms/DailyExpenseEntryForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { API_BASE_URL, api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Category, Expense, ExpenseImportResult } from "@/lib/types";
import { currentMonth, currentYear, formatPeso } from "@/lib/utils";

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ExpenseImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const query = useMemo(() => `/expenses?month=${month}&year=${year}${categoryId ? `&category_id=${categoryId}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`, [month, year, categoryId, search]);
  const load = () => api.get<Expense[]>(query).then(setExpenses);
  useEffect(() => { api.get<Category[]>("/categories").then(setCategories); }, []);
  useEffect(() => { load(); }, [query]);
  const exportCsv = () => {
    const token = getToken();
    fetch(`${API_BASE_URL}/expenses/export?month=${month}&year=${year}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `expenses-${year}-${String(month).padStart(2, "0")}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  };
  const downloadTemplate = () => {
    const token = getToken();
    fetch(`${API_BASE_URL}/expenses/import-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "expense-import-template.csv";
        anchor.click();
        URL.revokeObjectURL(url);
      });
  };
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/expenses/import?skip_duplicates=true`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Import failed");
      setImportResult(body);
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell month={month} year={year} onMonthChange={setMonth} onYearChange={setYear}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Expenses</h1><p className="text-sm text-muted-foreground">Log and review manual transactions.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
          <Dialog open={dailyOpen} onOpenChange={setDailyOpen}>
            <DialogTrigger asChild><Button variant="outline"><CalendarPlus className="h-4 w-4" /> Daily Entry</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader><DialogTitle>Daily Expense Entry</DialogTitle></DialogHeader>
              <DailyExpenseEntryForm
                categories={categories}
                onCancel={() => setDailyOpen(false)}
                onSubmit={async (payloads) => {
                  let savedCount = 0;
                  for (const payload of payloads) {
                    try {
                      await api.post("/expenses", payload);
                      savedCount += 1;
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "Unable to save expense.";
                      throw new Error(savedCount ? `Saved ${savedCount} of ${payloads.length} rows. ${message}` : message);
                    }
                  }
                  setDailyOpen(false);
                  await load();
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader><ExpenseForm categories={categories} initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/expenses/${editing.id}`, payload) : await api.post("/expenses", payload); setOpen(false); load(); }} /></DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="mb-4"><CardContent className="grid gap-3 pt-5 md:grid-cols-3">
        <Input placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importing}
              onChange={(event) => {
                importCsv(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </CardContent></Card>
      {importError ? <Card className="mb-4 border-destructive"><CardContent className="pt-5 text-sm text-destructive">{importError}</CardContent></Card> : null}
      {importResult ? (
        <Card className="mb-4">
          <CardContent className="space-y-3 pt-5 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-md bg-muted px-2 py-1">Imported: {importResult.imported_count}</span>
              <span className="rounded-md bg-muted px-2 py-1">Skipped: {importResult.skipped_count}</span>
              <span className="rounded-md bg-muted px-2 py-1">Errors: {importResult.error_count}</span>
            </div>
            {importResult.errors.length ? (
              <div className="space-y-1 text-destructive">
                {importResult.errors.slice(0, 5).map((error) => (
                  <p key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</p>
                ))}
                {importResult.errors.length > 5 ? <p>Showing first 5 errors.</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card><CardContent className="overflow-x-auto pt-5">
        <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Added by</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {expenses.map((expense) => <TableRow key={expense.id}><TableCell>{expense.expense_date}</TableCell><TableCell><p className="font-medium">{expense.description}</p><p className="text-xs text-muted-foreground">{expense.merchant || expense.payment_method}</p></TableCell><TableCell>{expense.category_name}</TableCell><TableCell>{expense.user_name}</TableCell><TableCell className="text-right">{formatPeso(expense.amount)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(expense); setOpen(true); }} aria-label="Edit expense"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/expenses/${expense.id}`); load(); }} aria-label="Delete expense"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
        </TableBody></Table>
        {!expenses.length ? <p className="py-6 text-sm text-muted-foreground">No expenses found for this filter.</p> : null}
      </CardContent></Card>
    </AppShell>
  );
}
