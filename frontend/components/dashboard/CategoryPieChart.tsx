"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPeso } from "@/lib/utils";

const fallback = ["#0f766e", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#dc2626"];

export function CategoryPieChart({ data }: { data: { name: string; total: number; color?: string | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || fallback[index % fallback.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatPeso(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
