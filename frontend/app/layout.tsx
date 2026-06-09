import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Expense Tracker | Household Budgeting",
  description: "Manual-first family budgeting with expenses, income, savings goals, recurring bills, and CSV tools."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
