import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Receipt, TrendingUp, AlertTriangle, CreditCard, RotateCcw } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Stockly" }] }),
  component: Dashboard,
});

const CHART_COLORS = ["oklch(0.62 0.21 38)", "oklch(0.70 0.18 150)", "oklch(0.55 0.17 250)", "oklch(0.78 0.16 75)", "oklch(0.55 0.20 320)"];

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString();

      const [salesRes, invRes, creditRes, returnsRes, damagesRes] = await Promise.all([
        supabase.from("sales").select("id, total_amount, cost_amount, items, payment_method, created_at, customer_name").gte("created_at", sinceISO).order("created_at", { ascending: false }),
        supabase.from("inventories").select("id, name, quantity, reorder_level, status, selling_price, purchase_price, category"),
        supabase.from("credit_sales").select("balance, status"),
        supabase.from("sales_returns").select("refund_amount, created_at").gte("created_at", sinceISO),
        supabase.from("damages").select("cost_loss, created_at").gte("created_at", sinceISO),
      ]);

      const sales = salesRes.data ?? [];
      const inv = invRes.data ?? [];
      const credit = creditRes.data ?? [];
      const returns = returnsRes.data ?? [];
      const damages = damagesRes.data ?? [];

      const revenue = sales.reduce((s, r) => s + Number(r.total_amount), 0);
      const cogs = sales.reduce((s, r) => s + Number(r.cost_amount ?? 0), 0);
      const returnsTotal = returns.reduce((s, r) => s + Number(r.refund_amount), 0);
      const damagesTotal = damages.reduce((s, r) => s + Number(r.cost_loss), 0);
      const profit = revenue - cogs - returnsTotal - damagesTotal;
      const unitsSold = sales.reduce((s, r) => s + (Array.isArray(r.items) ? (r.items as Array<{ quantity?: number }>).reduce((a, i) => a + (Number(i?.quantity) || 0), 0) : 0), 0);
      const lowStock = inv.filter((i) => i.status === "low" || i.status === "out_of_stock").length;
      const inventoryValue = inv.reduce((s, i) => s + Number(i.purchase_price) * Number(i.quantity), 0);
      const outstandingReceivables = credit.filter((c) => c.status !== "PAID").reduce((s, c) => s + Number(c.balance), 0);

      // Daily revenue series (30d)
      const dayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, 0);
      }
      for (const s of sales) {
        const key = (s.created_at as string).slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + Number(s.total_amount));
      }
      const trend = Array.from(dayMap.entries()).map(([d, v]) => ({ d: d.slice(5), revenue: v }));

      // Top categories
      const catMap = new Map<string, number>();
      for (const s of sales) {
        const items = Array.isArray(s.items) ? (s.items as Array<{ inventory_id?: string; quantity?: number; price?: number; category?: string }>) : [];
        for (const it of items) {
          const cat = it.category ?? "Uncategorized";
          catMap.set(cat, (catMap.get(cat) ?? 0) + Number(it.price ?? 0) * Number(it.quantity ?? 0));
        }
      }
      const topCategories = Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

      // Payment methods breakdown
      const payMap = new Map<string, number>();
      for (const s of sales) payMap.set(s.payment_method, (payMap.get(s.payment_method) ?? 0) + Number(s.total_amount));
      const payments = Array.from(payMap.entries()).map(([name, value]) => ({ name, value }));

      return {
        revenue, profit, unitsSold, lowStock, inventoryValue, outstandingReceivables,
        returnsTotal, damagesTotal, trend, topCategories, payments,
        recentSales: sales.slice(0, 8),
      };
    },
  });

  if (isLoading || !data) return <div className="p-6 text-muted-foreground">Loading dashboard…</div>;

  const kpis = [
    { label: "Revenue (30d)", value: formatCurrency(data.revenue), icon: TrendingUp, tone: "primary" },
    { label: "Net Profit (30d)", value: formatCurrency(data.profit), icon: Receipt, tone: data.profit >= 0 ? "success" : "destructive" },
    { label: "Units Sold", value: formatNumber(data.unitsSold), icon: Boxes, tone: "primary" },
    { label: "Inventory Value", value: formatCurrency(data.inventoryValue), icon: Boxes, tone: "primary" },
    { label: "Receivables", value: formatCurrency(data.outstandingReceivables), icon: CreditCard, tone: "warning" },
    { label: "Low / Out of Stock", value: formatNumber(data.lowStock), icon: AlertTriangle, tone: data.lowStock > 0 ? "destructive" : "success" },
    { label: "Returns (30d)", value: formatCurrency(data.returnsTotal), icon: RotateCcw, tone: "muted" },
    { label: "Damage Losses (30d)", value: formatCurrency(data.damagesTotal), icon: AlertTriangle, tone: "muted" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Last 30 days · live snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <span className={`h-8 w-8 grid place-items-center rounded-lg ${k.tone === "primary" ? "bg-primary/10 text-primary" : k.tone === "success" ? "bg-success/10 text-success" : k.tone === "destructive" ? "bg-destructive/10 text-destructive" : k.tone === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Sales trend · last 30 days</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 65)" />
              <XAxis dataKey="d" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="oklch(0.62 0.21 38)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Payment methods</h3>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.payments} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.payments.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Top categories by revenue</h3>
          {data.topCategories.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 65)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="oklch(0.62 0.21 38)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Recent sales</h3>
          {data.recentSales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet</p> : (
            <div className="divide-y">
              {data.recentSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{s.customer_name || "Walk-in"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at as string)} · {s.payment_method}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(s.total_amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
