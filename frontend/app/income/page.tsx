"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { api } from "@/lib/api";
import type { IncomeRecord } from "@/lib/types";
import { currentMonth, currentYear, formatPeso } from "@/lib/utils";

export default function IncomePage() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<IncomeRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRecord | undefined>();
  const load = () => api.get<IncomeRecord[]>(`/income?month=${month}&year=${year}`).then(setRows);
  useEffect(() => { load(); }, [month, year]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <AppShell month={month} year={year} onMonthChange={setMonth} onYearChange={setYear}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Income</h1><p className="text-sm text-muted-foreground">Track all household income sources.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit income" : "Add income"}</DialogTitle></DialogHeader><IncomeForm initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/income/${editing.id}`, payload) : await api.post("/income", payload); setOpen(false); load(); }} /></DialogContent></Dialog>
      </div>
      <Card><CardContent className="overflow-x-auto pt-5">
        <div className="mb-4 text-sm font-medium">Total income: {formatPeso(total)}</div>
        <Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Added by</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.source_name}</TableCell><TableCell>{row.user_name}</TableCell><TableCell>{row.notes || "-"}</TableCell><TableCell className="text-right">{formatPeso(row.amount)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(row); setOpen(true); }} aria-label="Edit income"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/income/${row.id}`); load(); }} aria-label="Delete income"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
        </TableBody></Table>
        {!rows.length ? <p className="py-6 text-sm text-muted-foreground">No income records for this period.</p> : null}
      </CardContent></Card>
    </AppShell>
  );
}
