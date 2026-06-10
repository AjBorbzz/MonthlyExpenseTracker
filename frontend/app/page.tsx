import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ChartNoAxesCombined,
  FileSpreadsheet,
  Goal,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";

const features = [
  {
    title: "Shared family workspace",
    description: "Invite household members, track who added each expense, and keep everyone looking at the same monthly picture.",
    icon: UsersRound
  },
  {
    title: "Budget health score",
    description: "See a simple status built from savings rate, overspending, projected savings, and category budget pressure.",
    icon: BadgeCheck
  },
  {
    title: "Spending velocity",
    description: "Know if the family is ahead of budget pace before the month gets away from you.",
    icon: ChartNoAxesCombined
  },
  {
    title: "Recurring expenses",
    description: "Register rent, subscriptions, loans, insurance, and other bills with upcoming due-date visibility.",
    icon: CalendarClock
  },
  {
    title: "Savings goals",
    description: "Plan for emergency funds, school fees, vacations, and other goals with clear progress tracking.",
    icon: Goal
  },
  {
    title: "CSV import and export",
    description: "Move manual expense records in and out with a consistent template built for household bookkeeping.",
    icon: FileSpreadsheet
  }
];

const workflow = [
  "Add income and daily expenses in Philippine Peso",
  "Allocate monthly category budgets",
  "Review charts, overspending, and savings projections",
  "Export or import expense CSV files when records need to move"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-[88svh] overflow-hidden bg-[#081c18] text-white">
        <Image
          src="/landing/dashboard-preview.png"
          alt="Family expense tracker dashboard shown on a laptop and mobile phone"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-[#061814]/75" />
        <div className="fixed inset-x-0 top-0 z-[100] border-b border-white/15 bg-[#061814]/35 backdrop-blur-md">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                <WalletCards className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90 sm:text-sm">
                <span className="sm:hidden">Family Tracker</span>
                <span className="hidden sm:inline">Family Expense Tracker</span>
              </span>
            </Link>
            <div className="hidden items-center gap-6 text-sm text-white/80 md:flex">
              <a className="transition hover:text-white" href="#features">
                Features
              </a>
              <a className="transition hover:text-white" href="#workflow">
                Workflow
              </a>
              <a className="transition hover:text-white" href="#security">
                Privacy
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-white transition hover:bg-white/10 whitespace-nowrap"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90 sm:px-4"
              >
                Start
              </Link>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/85 backdrop-blur">
              Manual-first household budgeting
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Family Expense Tracker</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
              A clean family workspace for tracking income, expenses, budgets, savings goals, recurring bills, and month-end behavior without bank sync or paid services.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg shadow-black/20 transition hover:bg-accent/90"
              >
                Create family workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Open existing account
              </Link>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 text-sm text-white/80">
              <div className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur">
                <span className="block text-xl font-semibold text-white">₱</span>
                Peso-ready
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur">
                <span className="block text-xl font-semibold text-white">JWT</span>
                Protected app
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur">
                <span className="block text-xl font-semibold text-white">CSV</span>
                Import/export
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Built for real households</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">Everything a family needs to understand the month.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The app focuses on shared manual tracking, clear dashboards, and practical financial signals that do not require AI, bank sync, or third-party paid APIs.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-background py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Monthly rhythm</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">From daily entries to month-end clarity.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Use it like a household finance command center: add records, check budget pace, compare years, and keep savings goals visible.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3">
            {workflow.map((item, index) => (
              <div key={item} className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/20 text-sm font-semibold text-foreground">
                  {index + 1}
                </span>
                <p className="text-sm font-medium sm:text-base">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="border-y bg-white py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Private by design for version 1.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold">No bank sync</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Manual records keep the MVP simple, understandable, and under the family&apos;s control.</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold">Family-scoped data</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Every budget, expense, goal, and income record belongs to the authenticated family workspace.</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold">Password auth</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Accounts use hashed passwords and JWT access tokens for protected dashboard routes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-12 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to organize your household budget?</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Create a workspace, invite your family, and start tracking the month with real data.</p>
          </div>
          <Link
            href="/signup"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
          >
            Create account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
