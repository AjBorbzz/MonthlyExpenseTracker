"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category, Expense } from "@/lib/types";

export function ExpenseForm({ categories, initial, onSubmit }: { categories: Category[]; initial?: Expense; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        const form = new FormData(event.currentTarget);
        await onSubmit({
          category_id: Number(form.get("category_id")),
          amount: Number(form.get("amount")),
          description: form.get("description"),
          merchant: form.get("merchant") || null,
          payment_method: form.get("payment_method") || null,
          expense_date: form.get("expense_date"),
          notes: form.get("notes") || null,
          is_recurring: form.get("is_recurring") === "on"
        });
        setSaving(false);
      }}
    >
      <Input name="description" placeholder="Description" defaultValue={initial?.description} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount" defaultValue={initial?.amount} required />
        <Input name="expense_date" type="date" defaultValue={initial?.expense_date ?? new Date().toISOString().slice(0, 10)} required />
      </div>
      <Select name="category_id" defaultValue={initial?.category_id ? String(initial.category_id) : ""} required>
        <option value="" disabled>
          Category
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="merchant" placeholder="Merchant" defaultValue={initial?.merchant ?? ""} />
        <Input name="payment_method" placeholder="Payment method" defaultValue={initial?.payment_method ?? ""} />
      </div>
      <Input name="notes" placeholder="Notes" defaultValue={initial?.notes ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_recurring" defaultChecked={initial?.is_recurring} />
        Recurring expense
      </label>
      <Button disabled={saving}>{saving ? "Saving..." : "Save expense"}</Button>
    </form>
  );
}
