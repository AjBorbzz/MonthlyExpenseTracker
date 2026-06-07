"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BudgetAllocation, Category } from "@/lib/types";
import { currentMonth, currentYear } from "@/lib/utils";

export function BudgetAllocationForm({ categories, initial, onSubmit }: { categories: Category[]; initial?: BudgetAllocation; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          category_id: Number(form.get("category_id")),
          allocated_amount: Number(form.get("allocated_amount")),
          budget_month: Number(form.get("budget_month")),
          budget_year: Number(form.get("budget_year"))
        });
      }}
    >
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
      <Input name="allocated_amount" type="number" step="0.01" min="0" placeholder="Allocated amount" defaultValue={initial?.allocated_amount} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="budget_month" type="number" min="1" max="12" defaultValue={initial?.budget_month ?? currentMonth} required />
        <Input name="budget_year" type="number" min="2000" max="2100" defaultValue={initial?.budget_year ?? currentYear} required />
      </div>
      <Button>Save budget</Button>
    </form>
  );
}
