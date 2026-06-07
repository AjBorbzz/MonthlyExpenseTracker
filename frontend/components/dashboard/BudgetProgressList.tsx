import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPeso } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

export function BudgetProgressList({ data }: { data: DashboardSummary["budget_vs_actual"] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">No budgets set for this period.</p>;
  return (
    <div className="space-y-4">
      {data.map((row) => (
        <div key={row.category_id} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{row.category_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatPeso(row.actual_spent)} of {formatPeso(row.allocated_budget)}
              </p>
            </div>
            <Badge variant={row.status === "over_budget" ? "destructive" : row.status === "warning" ? "secondary" : "outline"}>{row.rollover_indicator}</Badge>
          </div>
          <Progress value={row.percentage_used} />
        </div>
      ))}
    </div>
  );
}
