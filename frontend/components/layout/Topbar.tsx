"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getStoredFamily, getStoredUser } from "@/lib/auth";
import type { Family, User } from "@/lib/types";
import { months } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type TopbarProps = {
  month?: number;
  year?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
};

export function Topbar({ month, year, onMonthChange, onYearChange }: TopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);

  useEffect(() => {
    setUser(getStoredUser());
    setFamily(getStoredFamily());
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{family?.name ?? "Family Workspace"}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.full_name ?? "Signed in"}</p>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-wrap">
        {month && onMonthChange ? (
          <Select value={String(month)} onChange={(event) => onMonthChange(Number(event.target.value))} className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            {months.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ) : null}
        {year && onYearChange ? (
          <Select value={String(year)} onChange={(event) => onYearChange(Number(event.target.value))} className="w-24 sm:w-28">
            {years.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </Select>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          aria-label="Sign out"
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
