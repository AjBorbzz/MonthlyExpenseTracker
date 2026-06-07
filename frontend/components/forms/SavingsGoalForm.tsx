"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavingsGoal } from "@/lib/types";

export function SavingsGoalForm({ initial, onSubmit }: { initial?: SavingsGoal; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          name: form.get("name"),
          target_amount: Number(form.get("target_amount")),
          current_amount: Number(form.get("current_amount")),
          target_date: form.get("target_date") || null
        });
      }}
    >
      <Input name="name" placeholder="Goal name" defaultValue={initial?.name} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="target_amount" type="number" step="0.01" min="0" placeholder="Target amount" defaultValue={initial?.target_amount} required />
        <Input name="current_amount" type="number" step="0.01" min="0" placeholder="Current amount" defaultValue={initial?.current_amount ?? 0} required />
      </div>
      <Input name="target_date" type="date" defaultValue={initial?.target_date ?? ""} />
      <Button>Save goal</Button>
    </form>
  );
}
