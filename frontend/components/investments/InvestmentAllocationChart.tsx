"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPeso } from "@/lib/utils";

type AllocationItem = {
  name: string;
  value: number;
  color: string;
};

export function InvestmentAllocationChart({ data }: { data: AllocationItem[] }) {
  if (!data.length) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No portfolio allocation yet.</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="44%" innerRadius={54} outerRadius={88} paddingAngle={2}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value: number) => formatPeso(value)} />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
