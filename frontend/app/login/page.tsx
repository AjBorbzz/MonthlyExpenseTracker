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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">Open your family budget workspace.</p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const form = new FormData(event.currentTarget);
              try {
                const auth = await api.post<AuthResponse>("/auth/login", { email: form.get("email"), password: form.get("password") }, { skipAuth: true });
                saveSession(auth);
                router.push("/dashboard");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to sign in");
              }
            }}
          >
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button>Sign in</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link className="font-medium text-primary" href="/signup">
              Create or join a family
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
