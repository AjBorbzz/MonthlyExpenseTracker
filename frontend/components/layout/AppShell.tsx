"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getToken } from "@/lib/auth";
import { currentMonth, currentYear } from "@/lib/utils";
import { AppSidebar, MobileNav } from "./AppSidebar";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: React.ReactNode;
  month?: number;
  year?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
};

export function AppShell({ children, month = currentMonth, year = currentYear, onMonthChange, onYearChange }: AppShellProps) {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <Topbar month={month} year={year} onMonthChange={onMonthChange} onYearChange={onYearChange} />
        <MobileNav />
        <main className="mx-auto max-w-7xl px-3 pb-24 pt-5 sm:px-4 sm:pb-8 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
