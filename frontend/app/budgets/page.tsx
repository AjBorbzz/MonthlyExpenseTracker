"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BudgetAllocationForm } from "@/components/forms/BudgetAllocationForm";
import { api } from "@/lib/api";
import type { BudgetAllocation, Category, IncomeRecord } from "@/lib/types";
import { currentMonth, currentYear, formatPeso } from "@/lib/utils";

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetAllocation | undefined>();
  const load = () => { api.get<BudgetAllocation[]>(`/budgets?month=${month}&year=${year}`).then(setBudgets); api.get<IncomeRecord[]>(`/income?month=${month}&year=${year}`).then(setIncome); };
  useEffect(() => { api.get<Category[]>("/categories").then(setCategories); }, []);
  useEffect(() => { load(); }, [month, year]);
  const allocated = budgets.reduce((sum, row) => sum + row.allocated_amount, 0);
  const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);

  return (
    <AppShell month={month} year={year} onMonthChange={setMonth} onYearChange={setYear}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Budgets</h1><p className="text-sm text-muted-foreground">Allocate category budgets and monitor pace.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit budget" : "Add budget"}</DialogTitle></DialogHeader><BudgetAllocationForm categories={categories} initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/budgets/${editing.id}`, payload) : await api.post("/budgets", payload); setOpen(false); load(); }} /></DialogContent></Dialog>
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Allocated</p><p className="text-2xl font-semibold">{formatPeso(allocated)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Income</p><p className="text-2xl font-semibold">{formatPeso(totalIncome)}</p></CardContent></Card>
        <Card className={allocated > totalIncome && totalIncome > 0 ? "border-destructive" : ""}><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Plan status</p><p className="text-2xl font-semibold">{allocated > totalIncome && totalIncome > 0 ? "Over income" : "Balanced"}</p></CardContent></Card>
      </div>
      <Card><CardContent className="overflow-x-auto pt-5">
        <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {budgets.map((budget) => <TableRow key={budget.id}><TableCell className="font-medium">{budget.category_name}</TableCell><TableCell className="min-w-52"><Progress value={budget.percentage_used} /><p className="mt-1 text-xs text-muted-foreground">{formatPeso(budget.actual_spent)} of {formatPeso(budget.allocated_amount)}</p></TableCell><TableCell><Badge variant={budget.status === "over_budget" ? "destructive" : "outline"}>{budget.rollover_indicator}</Badge></TableCell><TableCell className="text-right">{formatPeso(budget.remaining_budget)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(budget); setOpen(true); }} aria-label="Edit budget"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/budgets/${budget.id}`); load(); }} aria-label="Delete budget"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
        </TableBody></Table>
        {!budgets.length ? <p className="py-6 text-sm text-muted-foreground">No budgets set for this period.</p> : null}
      </CardContent></Card>
    </AppShell>
  );
}
