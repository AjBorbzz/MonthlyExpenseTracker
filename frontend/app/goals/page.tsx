"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { SavingsGoalForm } from "@/components/forms/SavingsGoalForm";
import { api } from "@/lib/api";
import type { SavingsGoal } from "@/lib/types";
import { formatPeso } from "@/lib/utils";

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>();
  const load = () => api.get<SavingsGoal[]>("/savings-goals").then(setGoals);
  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Savings Goals</h1><p className="text-sm text-muted-foreground">Monitor emergency funds and big family targets.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit goal" : "Add goal"}</DialogTitle></DialogHeader><SavingsGoalForm initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/savings-goals/${editing.id}`, payload) : await api.post("/savings-goals", payload); setOpen(false); load(); }} /></DialogContent></Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader><CardTitle>{goal.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Progress value={goal.progress_percent} />
              <div className="flex items-center justify-between text-sm"><span>{formatPeso(goal.current_amount)}</span><span className="text-muted-foreground">{formatPeso(goal.target_amount)}</span></div>
              <p className="text-sm text-muted-foreground">{goal.target_date ? `Target date: ${goal.target_date}` : "No target date"}</p>
              <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(goal); setOpen(true); }} aria-label="Edit goal"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/savings-goals/${goal.id}`); load(); }} aria-label="Delete goal"><Trash2 className="h-4 w-4" /></Button></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!goals.length ? <Card><CardContent className="pt-5 text-sm text-muted-foreground">No savings goals yet.</CardContent></Card> : null}
    </AppShell>
  );
}
