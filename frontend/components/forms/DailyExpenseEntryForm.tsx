"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category } from "@/lib/types";
import { formatPeso } from "@/lib/utils";

type DailyExpenseRow = {
  id: number;
  category_id: string;
  description: string;
  amount: string;
};

type DailyExpensePayload = {
  category_id: number;
  amount: number;
  description: string;
  expense_date: string;
  notes: string | null;
  is_recurring: boolean;
};

const makeRow = (id: number): DailyExpenseRow => ({
  id,
  category_id: "",
  description: "",
  amount: ""
});

export function DailyExpenseEntryForm({
  categories,
  onCancel,
  onSubmit
}: {
  categories: Category[];
  onCancel: () => void;
  onSubmit: (payloads: DailyExpensePayload[]) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<DailyExpenseRow[]>([makeRow(1), makeRow(2), makeRow(3)]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const categoryById = useMemo(() => new Map(categories.map((category) => [String(category.id), category])), [categories]);
  const total = rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);

  const updateRow = (id: number, key: keyof Omit<DailyExpenseRow, "id">, value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const removeRow = (id: number) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const addRow = () => {
    setRows((current) => [...current, makeRow(Math.max(...current.map((row) => row.id)) + 1)]);
  };

  const buildPayloads = () => {
    const validationErrors: string[] = [];
    const payloads: DailyExpensePayload[] = [];

    if (!date) validationErrors.push("Date is required.");

    rows.forEach((row, index) => {
      const hasAnyValue = Boolean(row.category_id || row.description.trim() || row.amount);
      if (!hasAnyValue) return;

      const amount = Number(row.amount);
      if (!row.category_id) validationErrors.push(`Row ${index + 1}: category is required.`);
      if (!Number.isFinite(amount) || amount <= 0) validationErrors.push(`Row ${index + 1}: amount must be greater than 0.`);

      const category = categoryById.get(row.category_id);
      if (row.category_id && Number.isFinite(amount) && amount > 0 && category) {
        const description = row.description.trim() || `${category.name} expense`;
        payloads.push({
          category_id: Number(row.category_id),
          amount,
          description,
          expense_date: date,
          notes: row.description.trim() || null,
          is_recurring: false
        });
      }
    });

    if (!payloads.length) validationErrors.push("Add at least one row with a category and amount greater than 0.");
    return { payloads, validationErrors };
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setErrors([]);
        const { payloads, validationErrors } = buildPayloads();
        if (validationErrors.length) {
          setErrors(validationErrors);
          return;
        }
        setSaving(true);
        try {
          await onSubmit(payloads);
        } catch (err) {
          setErrors([err instanceof Error ? err.message : "Unable to save daily expenses."]);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="daily-expense-date">Date</label>
        <Input id="daily-expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.4fr)_8rem_2.25rem] md:items-center">
            <Select value={row.category_id} onChange={(event) => updateRow(row.id, "category_id", event.target.value)} aria-label={`Row ${index + 1} category`}>
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Input
              value={row.description}
              placeholder="Description / notes"
              onChange={(event) => updateRow(row.id, "description", event.target.value)}
              aria-label={`Row ${index + 1} description or notes`}
            />
            <Input
              value={row.amount}
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              onChange={(event) => updateRow(row.id, "amount", event.target.value)}
              aria-label={`Row ${index + 1} amount`}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`Remove row ${index + 1}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{formatPeso(total)}</span>
        </div>
      </div>

      {errors.length ? (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save all expenses"}</Button>
      </div>
    </form>
  );
}
