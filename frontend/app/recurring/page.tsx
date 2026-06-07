"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecurringExpenseForm } from "@/components/forms/RecurringExpenseForm";
import { api } from "@/lib/api";
import type { Category, RecurringExpense } from "@/lib/types";
import { formatPeso } from "@/lib/utils";

export default function RecurringPage() {
  const [rows, setRows] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | undefined>();
  const load = () => api.get<RecurringExpense[]>("/recurring").then(setRows);
  useEffect(() => { api.get<Category[]>("/categories").then(setCategories); load(); }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Recurring</h1><p className="text-sm text-muted-foreground">Track subscriptions, rent, loans, and repeat bills.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit recurring expense" : "Add recurring expense"}</DialogTitle></DialogHeader><RecurringExpenseForm categories={categories} initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/recurring/${editing.id}`, payload) : await api.post("/recurring", payload); setOpen(false); load(); }} /></DialogContent></Dialog>
      </div>
      <Card><CardContent className="overflow-x-auto pt-5">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Frequency</TableHead><TableHead>Next due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.category_name}</TableCell><TableCell>{row.frequency}</TableCell><TableCell>{row.next_due_date}</TableCell><TableCell><Badge variant={row.is_active ? "outline" : "secondary"}>{row.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right">{formatPeso(row.amount)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(row); setOpen(true); }} aria-label="Edit recurring"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/recurring/${row.id}`); load(); }} aria-label="Delete recurring"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
        </TableBody></Table>
        {!rows.length ? <p className="py-6 text-sm text-muted-foreground">No recurring expenses yet.</p> : null}
      </CardContent></Card>
    </AppShell>
  );
}
