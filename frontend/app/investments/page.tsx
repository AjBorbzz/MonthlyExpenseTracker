"use client";

import { Edit3, Plus, Search, Trash2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InvestmentForm } from "@/components/forms/InvestmentForm";
import { InvestmentAllocationChart } from "@/components/investments/InvestmentAllocationChart";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Investment, InvestmentType } from "@/lib/types";
import { investmentTypeOptions } from "@/lib/types";
import { cn, formatPeso } from "@/lib/utils";

const allocationColors = ["#0f766e", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#dc2626", "#65a30d", "#0891b2", "#64748b"];

function assetTypeLabel(value: InvestmentType) {
  return investmentTypeOptions.find((type) => type.value === value)?.label ?? value;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 8 }).format(value);
}

function SummaryCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-xl font-semibold sm:text-2xl", tone === "positive" && "text-emerald-700", tone === "negative" && "text-destructive")}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState<"all" | InvestmentType>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInvestments(await api.get<Investment[]>("/investments"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load investments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return investments.filter((investment) => {
      const matchesType = assetType === "all" || investment.asset_type === assetType;
      const matchesSearch = !query || [investment.asset_name, investment.symbol, investment.institution]
        .some((value) => value?.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [assetType, investments, search]);

  const totals = useMemo(() => {
    const invested = investments.reduce((sum, item) => sum + item.invested_amount, 0);
    const current = investments.reduce((sum, item) => sum + item.current_value, 0);
    const gain = current - invested;
    return { invested, current, gain, returnPercentage: invested ? gain / invested * 100 : 0 };
  }, [investments]);

  const allocation = useMemo(() => investmentTypeOptions.map((type, index) => ({
    name: type.label,
    value: investments
      .filter((investment) => investment.asset_type === type.value)
      .reduce((sum, investment) => sum + investment.current_value, 0),
    color: allocationColors[index % allocationColors.length]
  })).filter((item) => item.value > 0), [investments]);

  const handleDelete = async (investment: Investment) => {
    if (!window.confirm(`Delete ${investment.asset_name}?`)) return;
    setError("");
    try {
      await api.delete(`/investments/${investment.id}`);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete investment.");
    }
  };

  const openEditDialog = (investment: Investment) => {
    setEditing(investment);
    setOpen(true);
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">Family holdings and manually updated portfolio values.</p>
        </div>
        <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEditing(undefined); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add investment</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit investment" : "Add investment"}</DialogTitle></DialogHeader>
            <InvestmentForm
              initial={editing}
              onSubmit={async (payload) => {
                if (editing) await api.put(`/investments/${editing.id}`, payload);
                else await api.post("/investments", payload);
                setOpen(false);
                setEditing(undefined);
                await load();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error ? <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Invested capital" value={formatPeso(totals.invested)} detail={`${investments.length} holding${investments.length === 1 ? "" : "s"}`} />
        <SummaryCard label="Current value" value={formatPeso(totals.current)} detail="Latest manual valuation" />
        <SummaryCard label="Total gain / loss" value={formatPeso(totals.gain)} detail={totals.gain >= 0 ? "Portfolio is above cost" : "Portfolio is below cost"} tone={totals.gain > 0 ? "positive" : totals.gain < 0 ? "negative" : "default"} />
        <SummaryCard label="Overall return" value={`${totals.returnPercentage.toFixed(2)}%`} detail="Based on invested capital" tone={totals.returnPercentage > 0 ? "positive" : totals.returnPercentage < 0 ? "negative" : "default"} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card>
          <CardHeader><CardTitle>Holdings overview</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {allocation.slice(0, 3).map((item) => {
              const percentage = totals.current ? item.value / totals.current * 100 : 0;
              return (
                <div key={item.name} className="border-l-2 pl-3" style={{ borderColor: item.color }}>
                  <p className="text-sm text-muted-foreground">{item.name}</p>
                  <p className="mt-1 font-semibold">{formatPeso(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of portfolio</p>
                </div>
              );
            })}
            {!allocation.length ? <p className="text-sm text-muted-foreground sm:col-span-3">No holdings recorded yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Allocation by asset type</CardTitle></CardHeader>
          <CardContent><InvestmentAllocationChart data={allocation} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Portfolio holdings</CardTitle>
            <p className="text-sm text-muted-foreground">{filteredInvestments.length} of {investments.length} shown</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search investments" className="pl-9" placeholder="Search investments" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select aria-label="Filter by asset type" className="sm:w-44" value={assetType} onChange={(event) => setAssetType(event.target.value as "all" | InvestmentType)}>
              <option value="all">All asset types</option>
              {investmentTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading investments...</div> : null}

          {!loading && filteredInvestments.length ? (
            <>
              <div className="grid gap-3 md:hidden">
                {filteredInvestments.map((investment) => (
                  <div key={investment.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-semibold">{investment.asset_name}</p>
                          {investment.symbol ? <Badge variant="secondary">{investment.symbol}</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{assetTypeLabel(investment.asset_type)}{investment.institution ? ` · ${investment.institution}` : ""}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(investment)} aria-label={`Edit ${investment.asset_name}`}><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(investment)} aria-label={`Delete ${investment.asset_name}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Invested</p><p className="font-medium">{formatPeso(investment.invested_amount)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Current value</p><p className="font-medium">{formatPeso(investment.current_value)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Quantity</p><p className="font-medium">{formatQuantity(investment.quantity)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Return</p><ReturnValue investment={investment} /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[900px]">
                  <TableHeader><TableRow><TableHead>Investment</TableHead><TableHead>Asset type</TableHead><TableHead>Institution</TableHead><TableHead>Added by</TableHead><TableHead className="text-right">Invested</TableHead><TableHead className="text-right">Current value</TableHead><TableHead className="text-right">Return</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredInvestments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell><p className="font-medium">{investment.asset_name}</p><p className="text-xs text-muted-foreground">{investment.symbol ? `${investment.symbol} · ` : ""}{formatQuantity(investment.quantity)} units</p></TableCell>
                        <TableCell><Badge variant="outline">{assetTypeLabel(investment.asset_type)}</Badge></TableCell>
                        <TableCell>{investment.institution || "-"}</TableCell>
                        <TableCell>{investment.user_name || "-"}</TableCell>
                        <TableCell className="text-right">{formatPeso(investment.invested_amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPeso(investment.current_value)}</TableCell>
                        <TableCell className="text-right"><ReturnValue investment={investment} /></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openEditDialog(investment)} aria-label={`Edit ${investment.asset_name}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(investment)} aria-label={`Delete ${investment.asset_name}`}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {!loading && !filteredInvestments.length ? (
            <div className="flex min-h-44 flex-col items-center justify-center text-center">
              <WalletCards className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{investments.length ? "No matching investments" : "No investments yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{investments.length ? "Adjust the search or asset type filter." : "Add the first holding to start tracking the portfolio."}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ReturnValue({ investment }: { investment: Investment }) {
  const positive = investment.gain_loss >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", positive ? "text-emerald-700" : "text-destructive")}>
      <Icon className="h-3.5 w-3.5" />
      {investment.return_percentage.toFixed(2)}%
    </span>
  );
}
