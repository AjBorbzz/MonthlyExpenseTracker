"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Investment } from "@/lib/types";
import { investmentTypeOptions } from "@/lib/types";

type InvestmentFormProps = {
  initial?: Investment;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

export function InvestmentForm({ initial, onSubmit }: InvestmentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const currentValue = form.get("current_value")?.toString().trim();

        try {
          await onSubmit({
            asset_name: form.get("asset_name"),
            asset_type: form.get("asset_type"),
            symbol: form.get("symbol") || null,
            quantity: Number(form.get("quantity") || 0),
            invested_amount: Number(form.get("invested_amount")),
            current_value: currentValue ? Number(currentValue) : null,
            acquisition_date: form.get("acquisition_date") || null,
            institution: form.get("institution") || null,
            notes: form.get("notes") || null
          });
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to save investment.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <label className="text-sm font-medium" htmlFor="investment-name">Investment name</label>
        <Input id="investment-name" name="asset_name" placeholder="Ayala Corporation" defaultValue={initial?.asset_name} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-type">Asset type</label>
          <Select id="investment-type" name="asset_type" defaultValue={initial?.asset_type ?? "stocks"} required>
            {investmentTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-symbol">Symbol</label>
          <Input id="investment-symbol" name="symbol" placeholder="AC" maxLength={24} defaultValue={initial?.symbol ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-quantity">Quantity</label>
          <Input id="investment-quantity" name="quantity" type="number" step="0.00000001" min="0" defaultValue={initial?.quantity ?? 0} required />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-date">Acquisition date</label>
          <Input id="investment-date" name="acquisition_date" type="date" defaultValue={initial?.acquisition_date ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-cost">Invested amount</label>
          <Input id="investment-cost" name="invested_amount" type="number" step="0.01" min="0.01" placeholder="0.00" defaultValue={initial?.invested_amount} required />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="investment-value">Current value</label>
          <Input id="investment-value" name="current_value" type="number" step="0.01" min="0" placeholder="Defaults to invested amount" defaultValue={initial?.current_value} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium" htmlFor="investment-institution">Institution or platform</label>
        <Input id="investment-institution" name="institution" placeholder="Broker, bank, or platform" maxLength={180} defaultValue={initial?.institution ?? ""} />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium" htmlFor="investment-notes">Notes</label>
        <Input id="investment-notes" name="notes" placeholder="Optional notes" defaultValue={initial?.notes ?? ""} />
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save investment"}</Button>
    </form>
  );
}
