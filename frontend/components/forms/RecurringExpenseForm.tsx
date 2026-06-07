"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category, RecurringExpense } from "@/lib/types";

export function RecurringExpenseForm({ categories, initial, onSubmit }: { categories: Category[]; initial?: RecurringExpense; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          category_id: Number(form.get("category_id")),
          name: form.get("name"),
          amount: Number(form.get("amount")),
          frequency: form.get("frequency"),
          next_due_date: form.get("next_due_date"),
          is_active: form.get("is_active") === "on",
          notes: form.get("notes") || null
        });
      }}
    >
      <Input name="name" placeholder="Recurring name" defaultValue={initial?.name} required />
      <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount" defaultValue={initial?.amount} required />
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
        <Select name="frequency" defaultValue={initial?.frequency ?? "monthly"}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
        </Select>
        <Input name="next_due_date" type="date" defaultValue={initial?.next_due_date ?? new Date().toISOString().slice(0, 10)} required />
      </div>
      <Input name="notes" placeholder="Notes" defaultValue={initial?.notes ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} />
        Active
      </label>
      <Button>Save recurring expense</Button>
    </form>
  );
}
