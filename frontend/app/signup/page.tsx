"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <p className="text-sm text-muted-foreground">Start a household workspace or join with an invite code.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "create" ? "default" : "outline"} onClick={() => setMode("create")}>
              Create family
            </Button>
            <Button type="button" variant={mode === "join" ? "default" : "outline"} onClick={() => setMode("join")}>
              Join family
            </Button>
          </div>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const form = new FormData(event.currentTarget);
              const payload = {
                full_name: form.get("full_name"),
                email: form.get("email"),
                password: form.get("password"),
                family_name: mode === "create" ? form.get("family_name") : undefined,
                invite_code: mode === "join" ? form.get("invite_code") : undefined
              };
              try {
                const auth = await api.post<AuthResponse>("/auth/signup", payload, { skipAuth: true });
                saveSession(auth);
                router.push("/dashboard");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to sign up");
              }
            }}
          >
            <Input name="full_name" placeholder="Full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" minLength={8} required />
            {mode === "create" ? <Input name="family_name" placeholder="Family workspace name" required /> : <Input name="invite_code" placeholder="Invite code" required />}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button>Create account</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
