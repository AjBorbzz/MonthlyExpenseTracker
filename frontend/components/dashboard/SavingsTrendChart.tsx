"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPeso } from "@/lib/utils";

export function SavingsTrendChart({ data }: { data: { month: string; saved: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `₱${Number(value) / 1000}k`} />
        <Tooltip formatter={(value) => formatPeso(Number(value))} />
        <Area type="monotone" dataKey="saved" stroke="#2563eb" fill="#2563eb" fillOpacity={0.16} name="Saved" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
