"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPeso } from "@/lib/utils";

export function YearComparisonChart({ data }: { data: { month: string; current_year: number; previous_year: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
        <Tooltip formatter={(value) => formatPeso(Number(value))} />
        <Legend />
        <Bar dataKey="current_year" fill="#0f766e" name="Selected year" radius={[4, 4, 0, 0]} />
        <Bar dataKey="previous_year" fill="#f59e0b" name="Previous year" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
