"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/types";

export function CategoryForm({ initial, onSubmit }: { initial?: Category; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          name: form.get("name"),
          description: form.get("description") || null,
          color: form.get("color") || null,
          icon: form.get("icon") || null
        });
      }}
    >
      <Input name="name" placeholder="Category name" defaultValue={initial?.name} required />
      <Input name="description" placeholder="Description" defaultValue={initial?.description ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="color" type="color" defaultValue={initial?.color ?? "#0f766e"} />
        <Input name="icon" placeholder="Icon name" defaultValue={initial?.icon ?? ""} />
      </div>
      <Button>Save category</Button>
    </form>
  );
}
