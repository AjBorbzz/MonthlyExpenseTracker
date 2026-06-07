"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, CircleDollarSign, FolderOpen, Gauge, Home, PiggyBank, ReceiptText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/income", label: "Income", icon: CircleDollarSign },
  { href: "/budgets", label: "Budgets", icon: BarChart3 },
  { href: "/goals", label: "Goals", icon: PiggyBank },
  { href: "/recurring", label: "Recurring", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-card px-3 py-4 lg:block">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Home className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Family Ledger</p>
          <p className="text-xs text-muted-foreground">Peso budgeting</p>
        </div>
      </Link>
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn("flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b bg-background px-3 py-2 lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium text-muted-foreground",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-card"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
