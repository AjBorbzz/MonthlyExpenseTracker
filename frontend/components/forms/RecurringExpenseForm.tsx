"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category, RecurringExpense } from "@/lib/types";

export function RecurringExpenseForm({ categories, initial, onSubmit }: { categories: Category[]; initial?: RecurringExpense; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
          await onSubmit({
            category_id: Number(form.get("category_id")),
            name: form.get("name"),
            amount: Number(form.get("amount")),
            frequency: form.get("frequency"),
            next_due_date: form.get("next_due_date"),
            merchant: form.get("merchant") || null,
            payment_method: form.get("payment_method") || null,
            is_active: form.get("is_active") === "on",
            notes: form.get("notes") || null
          });
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to save recurring expense.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <label htmlFor="recurring-name" className="text-sm font-medium">Name</label>
        <Input id="recurring-name" name="name" placeholder="Internet subscription" defaultValue={initial?.name} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="recurring-amount" className="text-sm font-medium">Amount</label>
          <Input id="recurring-amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" defaultValue={initial?.amount} required />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="recurring-category" className="text-sm font-medium">Category</label>
          <Select id="recurring-category" name="category_id" defaultValue={initial?.category_id ? String(initial.category_id) : ""} required>
            <option value="" disabled>Select category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="recurring-frequency" className="text-sm font-medium">Frequency</label>
          <Select id="recurring-frequency" name="frequency" defaultValue={initial?.frequency ?? "monthly"}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="recurring-due-date" className="text-sm font-medium">Next due date</label>
          <Input id="recurring-due-date" name="next_due_date" type="date" defaultValue={initial?.next_due_date ?? localToday} required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="merchant" placeholder="Merchant" defaultValue={initial?.merchant ?? ""} />
        <Input name="payment_method" placeholder="Payment method" defaultValue={initial?.payment_method ?? ""} />
      </div>
      <Input name="notes" placeholder="Notes" defaultValue={initial?.notes ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} />
        Active
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={saving}>{saving ? "Saving..." : "Save recurring expense"}</Button>
    </form>
  );
}
