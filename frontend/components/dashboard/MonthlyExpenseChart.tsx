"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPeso } from "@/lib/utils";

export function MonthlyExpenseChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
        <Tooltip formatter={(value) => formatPeso(Number(value))} />
        <Area type="monotone" dataKey="total" stroke="#0f766e" fill="#0f766e" fillOpacity={0.18} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
