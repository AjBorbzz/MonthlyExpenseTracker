"use client";

import { CalendarClock, Edit, PauseCircle, PlayCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RecurringExpenseForm } from "@/components/forms/RecurringExpenseForm";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Category, RecurringExpense, RecurringProcessResult } from "@/lib/types";
import { formatPeso } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "Not generated";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export default function RecurringPage() {
  const [rows, setRows] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | undefined>();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await api.get<RecurringExpense[]>("/recurring"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load recurring expenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load categories.");
    });
    load();
  }, [load]);

  const processDue = async () => {
    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const result = await api.post<RecurringProcessResult>("/recurring/process-due", {});
      setMessage(result.generated_count
        ? `${result.generated_count} expense${result.generated_count === 1 ? "" : "s"} added.`
        : "All recurring expenses are up to date.");
      await load();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Unable to process recurring expenses.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleActive = async (row: RecurringExpense) => {
    setError("");
    try {
      await api.put(`/recurring/${row.id}`, { is_active: !row.is_active });
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update recurring expense.");
    }
  };

  const deleteSchedule = async (row: RecurringExpense) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    setError("");
    try {
      await api.delete(`/recurring/${row.id}`);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete recurring expense.");
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring</h1>
          <p className="text-sm text-muted-foreground">Scheduled household expenses.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={processDue} disabled={processing}>
            <RefreshCw className={`h-4 w-4 ${processing ? "animate-spin" : ""}`} />
            Process due
          </Button>
          <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEditing(undefined); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit recurring expense" : "Add recurring expense"}</DialogTitle>
                <DialogDescription>Configure the amount, schedule, and expense details.</DialogDescription>
              </DialogHeader>
              <RecurringExpenseForm categories={categories} initial={editing} onSubmit={async (payload) => {
                if (editing) await api.put(`/recurring/${editing.id}`, payload);
                else await api.post("/recurring", payload);
                setOpen(false);
                setEditing(undefined);
                await load();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {message ? <div role="status" className="mb-4 rounded-md border bg-card px-4 py-3 text-sm">{message}</div> : null}

      <Card>
        <CardContent className="pt-5">
          {loading ? <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">Loading recurring expenses...</div> : null}

          {!loading && rows.length ? (
            <>
              <div className="grid gap-3 md:hidden">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{row.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{row.category_name} · {row.frequency}</p>
                      </div>
                      <Badge variant={row.is_active ? "outline" : "secondary"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-4 text-xl font-semibold">{formatPeso(row.amount)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Last generated</p><p>{formatDate(row.last_generated_date)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Next due</p><p>{formatDate(row.next_due_date)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Added by</p><p>{row.created_by_user_name || "-"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Payment</p><p>{row.payment_method || "-"}</p></div>
                    </div>
                    <ScheduleActions row={row} onEdit={() => { setEditing(row); setOpen(true); }} onToggle={() => toggleActive(row)} onDelete={() => deleteSchedule(row)} />
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[920px]">
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Frequency</TableHead><TableHead>Last generated</TableHead><TableHead>Next due</TableHead><TableHead>Added by</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.merchant || row.payment_method || "-"}</p></TableCell>
                      <TableCell>{row.category_name}</TableCell>
                      <TableCell className="capitalize">{row.frequency}</TableCell>
                      <TableCell>{formatDate(row.last_generated_date)}</TableCell>
                      <TableCell>{formatDate(row.next_due_date)}</TableCell>
                      <TableCell>{row.created_by_user_name || "-"}</TableCell>
                      <TableCell><Badge variant={row.is_active ? "outline" : "secondary"}>{row.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatPeso(row.amount)}</TableCell>
                      <TableCell><ScheduleActions row={row} onEdit={() => { setEditing(row); setOpen(true); }} onToggle={() => toggleActive(row)} onDelete={() => deleteSchedule(row)} /></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {!loading && !rows.length ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><CalendarClock className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No recurring expenses yet</p></div> : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ScheduleActions({ row, onEdit, onToggle, onDelete }: { row: RecurringExpense; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const ToggleIcon = row.is_active ? PauseCircle : PlayCircle;
  return (
    <div className="mt-4 flex justify-end gap-1 md:mt-0">
      <Button variant="ghost" size="icon" onClick={onToggle} aria-label={`${row.is_active ? "Deactivate" : "Activate"} ${row.name}`}><ToggleIcon className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${row.name}`}><Edit className="h-4 w-4" /></Button>
      {!row.last_generated_date ? <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${row.name}`}><Trash2 className="h-4 w-4" /></Button> : null}
    </div>
  );
}
