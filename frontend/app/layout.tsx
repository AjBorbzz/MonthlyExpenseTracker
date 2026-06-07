import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Expense Tracker",
  description: "Manual-first household budgeting dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
