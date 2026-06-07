"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IncomeRecord } from "@/lib/types";
import { currentMonth, currentYear } from "@/lib/utils";

export function IncomeForm({ initial, onSubmit }: { initial?: IncomeRecord; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          source_name: form.get("source_name"),
          amount: Number(form.get("amount")),
          income_month: Number(form.get("income_month")),
          income_year: Number(form.get("income_year")),
          notes: form.get("notes") || null
        });
      }}
    >
      <Input name="source_name" placeholder="Income source" defaultValue={initial?.source_name} required />
      <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount" defaultValue={initial?.amount} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="income_month" type="number" min="1" max="12" defaultValue={initial?.income_month ?? currentMonth} required />
        <Input name="income_year" type="number" min="2000" max="2100" defaultValue={initial?.income_year ?? currentYear} required />
      </div>
      <Input name="notes" placeholder="Notes" defaultValue={initial?.notes ?? ""} />
      <Button>Save income</Button>
    </form>
  );
}
