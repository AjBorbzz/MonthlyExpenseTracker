"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Family, User } from "@/lib/types";

type Me = { user: User; family: Family; role: string };

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { api.get<Me>("/auth/me").then(setMe); }, []);
  return (
    <AppShell>
      <div className="mb-6"><h1 className="text-2xl font-semibold">Settings</h1><p className="text-sm text-muted-foreground">Workspace and account details.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Family Workspace</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="text-muted-foreground">Name:</span> {me?.family.name ?? "Loading..."}</p><p><span className="text-muted-foreground">Invite code:</span> <span className="rounded-md bg-muted px-2 py-1 font-mono">{me?.family.invite_code}</span></p><p><span className="text-muted-foreground">Role:</span> {me?.role}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Current User</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="text-muted-foreground">Name:</span> {me?.user.full_name}</p><p><span className="text-muted-foreground">Email:</span> {me?.user.email}</p></CardContent></Card>
      </div>
    </AppShell>
  );
}
