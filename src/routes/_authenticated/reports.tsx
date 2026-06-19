import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet, FileText, BarChart3, Boxes, AlertTriangle, RotateCcw, CreditCard,
  TrendingUp, Building2, Users as UsersIcon, PackageX, PackagePlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportCSV, exportXLSX } from "@/lib/export-report";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · Stockly" }] }),
  component: ReportsPage,
});

const COLORS = ["oklch(0.62 0.21 38)", "oklch(0.70 0.18 150)", "oklch(0.55 0.17 250)", "oklch(0.78 0.16 75)", "oklch(0.55 0.20 320)"];

type Sale = { id: string; sale_ref: string; total_amount: number; cost_amount: number; items: unknown; payment_method: string; customer_name: string | null; created_at: string; branch_id: string | null; added_by: string | null };
type Inv = { id: string; name: string; sku: string | null; category: string; quantity: number; reorder_level: number; purchase_price: number; selling_price: number; status: string; branch_id: string | null };
type Damage = { id: string; name: string; category: string; quantity: number; reason: string; cost_loss: number; created_at: string; branch_id: string | null };
type Ret = { id: string; quantity: number; reason: string; refund_amount: number; created_at: string; inventory_id: string | null; branch_id: string | null };
type Credit = { id: string; buyer_name: string; total: number; amount_paid: number; balance: number; status: string; due_date: string | null; created_at: string };
type Branch = { id: string; name: string };
type Profile = { id: string; full_name: string };

type Receipt = { id: string; quantity: number; unit_cost: number; total_cost: number; reference: string | null; created_at: string; inventory_id: string; supplier_id: string | null; branch_id: string | null };
type Supplier = { id: string; name: string };

const SECTIONS = [
  { id: "sales-summary", label: "Sales Summary", icon: BarChart3 },
  { id: "stock-on-hand", label: "Stock on Hand", icon: Boxes },
  { id: "low-stock", label: "Low / Out of Stock", icon: PackageX },
  { id: "top-products", label: "Top Products & Categories", icon: TrendingUp },
  { id: "pnl", label: "Profit & Loss", icon: FileText },
  { id: "purchases", label: "Purchases", icon: PackagePlus },
  { id: "damages", label: "Damages", icon: AlertTriangle },
  { id: "returns", label: "Returns", icon: RotateCcw },
  { id: "credit", label: "Credit / Receivables", icon: CreditCard },
  { id: "staff", label: "Staff Performance", icon: UsersIcon },
  { id: "branch", label: "Branch Comparison", icon: Building2 },
] as const;

function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [branch, setBranch] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const fromISO = new Date(from).toISOString();
      const toISO = new Date(to + "T23:59:59").toISOString();
      const [salesR, invR, damR, retR, credR, brR, profR, recR, supR] = await Promise.all([
        supabase.from("sales").select("*").gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }),
        supabase.from("inventories").select("*"),
        supabase.from("damages").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("sales_returns").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("credit_sales").select("*"),
        supabase.from("branches").select("id, name"),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("stock_receipts").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("suppliers").select("id, name"),
      ]);
      return {
        sales: (salesR.data ?? []) as Sale[],
        inventory: (invR.data ?? []) as Inv[],
        damages: (damR.data ?? []) as Damage[],
        returns: (retR.data ?? []) as Ret[],
        credit: (credR.data ?? []) as Credit[],
        branches: (brR.data ?? []) as Branch[],
        profiles: (profR.data ?? []) as Profile[],
        receipts: (recR.data ?? []) as Receipt[],
        suppliers: (supR.data ?? []) as Supplier[],
      };
    },
  });

  const filteredSales = useMemo(() => (data?.sales ?? []).filter((s) => {
    if (branch !== "all" && s.branch_id !== branch) return false;
    if (category !== "all") {
      const items = Array.isArray(s.items) ? (s.items as Array<{ category?: string }>) : [];
      if (!items.some((it) => (it.category ?? "Uncategorized") === category)) return false;
    }
    return true;
  }), [data?.sales, branch, category]);

  const filteredInv = useMemo(() => (data?.inventory ?? []).filter((i) =>
    (category === "all" || i.category === category) && (branch === "all" || i.branch_id === branch || i.branch_id === null)
  ), [data?.inventory, branch, category]);

  const categories = useMemo(() => Array.from(new Set((data?.inventory ?? []).map((i) => i.category))).sort(), [data?.inventory]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Filter by date, branch and category, then download as CSV or Excel.</p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(data?.branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales-summary" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <s.icon className="h-3.5 w-3.5 mr-1.5" />{s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {!data || isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <TabsContent value="sales-summary"><SalesSummary sales={filteredSales} branches={data.branches} /></TabsContent>
            <TabsContent value="stock-on-hand"><StockOnHand inventory={filteredInv} /></TabsContent>
            <TabsContent value="low-stock"><LowStock inventory={filteredInv} /></TabsContent>
            <TabsContent value="top-products"><TopProducts sales={filteredSales} /></TabsContent>
            <TabsContent value="pnl"><PnL sales={filteredSales} returns={data.returns} damages={data.damages} /></TabsContent>
            <TabsContent value="purchases"><PurchasesReport receipts={data.receipts} inventory={data.inventory} suppliers={data.suppliers} /></TabsContent>
            <TabsContent value="damages"><DamagesReport damages={data.damages} /></TabsContent>
            <TabsContent value="returns"><ReturnsReport returns={data.returns} inventory={data.inventory} /></TabsContent>
            <TabsContent value="credit"><CreditReport credit={data.credit} /></TabsContent>
            <TabsContent value="staff"><StaffPerf sales={filteredSales} profiles={data.profiles} /></TabsContent>
            <TabsContent value="branch"><BranchCompare sales={filteredSales} branches={data.branches} /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function ExportBar({ section, rows }: { section: string; rows: Record<string, string | number | null | undefined>[] }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 mb-4">
      <p className="text-sm text-muted-foreground">{rows.length} rows</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportCSV(section, rows)}><FileText className="h-4 w-4" /> CSV</Button>
        <Button variant="hero" size="sm" disabled={!rows.length} onClick={() => exportXLSX(section, rows)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
      </div>
    </div>
  );
}

function PurchasesReport({ receipts, inventory, suppliers }: { receipts: Receipt[]; inventory: Inv[]; suppliers: Supplier[] }) {
  const invMap = new Map(inventory.map((i) => [i.id, i]));
  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const rows = receipts.map((r) => ({
    Date: formatDateTime(r.created_at),
    Item: invMap.get(r.inventory_id)?.name ?? "—",
    Category: invMap.get(r.inventory_id)?.category ?? "—",
    Supplier: r.supplier_id ? supMap.get(r.supplier_id) ?? "—" : "—",
    Quantity: r.quantity,
    "Unit Cost": Number(r.unit_cost),
    "Total Cost": Number(r.total_cost),
    Reference: r.reference ?? "",
  }));
  const totalSpent = rows.reduce((s, r) => s + Number(r["Total Cost"]), 0);
  const totalUnits = rows.reduce((s, r) => s + Number(r.Quantity), 0);

  // Spend by supplier chart
  const supSpend = new Map<string, number>();
  for (const r of receipts) {
    const k = r.supplier_id ? supMap.get(r.supplier_id) ?? "—" : "—";
    supSpend.set(k, (supSpend.get(k) ?? 0) + Number(r.total_cost));
  }
  const supRows = Array.from(supSpend.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <Section title="Purchases & stock receiving">
      <ExportBar section="purchases" rows={rows} />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KPI label="Receipts" value={rows.length.toString()} />
        <KPI label="Units received" value={totalUnits.toString()} />
        <KPI label="Total spend" value={formatCurrency(totalSpent)} />
      </div>
      {supRows.length > 0 && (
        <div className="h-56 mb-5">
          <ResponsiveContainer><BarChart data={supRows.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="value" fill="oklch(0.62 0.21 38)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
      )}
      <Table columns={[
        { key: "Date", label: "Date" }, { key: "Item", label: "Item" }, { key: "Category", label: "Category" }, { key: "Supplier", label: "Supplier" },
        { key: "Quantity", label: "Qty", align: "right" }, { key: "Unit Cost", label: "Unit cost", align: "right" }, { key: "Total Cost", label: "Total", align: "right" }, { key: "Reference", label: "Ref" },
      ]} rows={rows.map((r) => ({ ...r, "Unit Cost": formatCurrency(r["Unit Cost"]), "Total Cost": formatCurrency(r["Total Cost"]) }))} />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Table({ columns, rows }: { columns: { key: string; label: string; align?: "left" | "right" }[]; rows: Record<string, string | number | null | undefined>[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data for this range</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>{columns.map((c) => <th key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>{r[c.key] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ SECTIONS ============

function SalesSummary({ sales, branches }: { sales: Sale[]; branches: Branch[] }) {
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const rows = useMemo(() => sales.map((s) => ({
    Date: formatDateTime(s.created_at),
    Reference: s.sale_ref,
    Customer: s.customer_name ?? "Walk-in",
    Branch: s.branch_id ? branchMap.get(s.branch_id) ?? "—" : "—",
    "Payment Method": s.payment_method,
    Total: Number(s.total_amount),
    Cost: Number(s.cost_amount),
    Profit: Number(s.total_amount) - Number(s.cost_amount),
  })), [sales, branchMap]);

  // Daily chart
  const dayMap = new Map<string, number>();
  for (const s of sales) {
    const k = s.created_at.slice(0, 10);
    dayMap.set(k, (dayMap.get(k) ?? 0) + Number(s.total_amount));
  }
  const trend = Array.from(dayMap.entries()).sort().map(([d, v]) => ({ d: d.slice(5), revenue: v }));

  // By payment method
  const payMap = new Map<string, number>();
  for (const s of sales) payMap.set(s.payment_method, (payMap.get(s.payment_method) ?? 0) + Number(s.total_amount));
  const byPayment = Array.from(payMap.entries()).map(([name, value]) => ({ name, value }));

  const totals = {
    revenue: sales.reduce((s, r) => s + Number(r.total_amount), 0),
    cost: sales.reduce((s, r) => s + Number(r.cost_amount), 0),
    transactions: sales.length,
  };

  return (
    <>
      <Section title="Sales summary">
        <ExportBar section="sales_summary" rows={rows} />
        <div className="grid grid-cols-3 gap-3 mb-5">
          <KPI label="Revenue" value={formatCurrency(totals.revenue)} />
          <KPI label="COGS" value={formatCurrency(totals.cost)} />
          <KPI label="Transactions" value={totals.transactions.toString()} />
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Line type="monotone" dataKey="revenue" stroke="oklch(0.62 0.21 38)" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>
          </div>
          <div className="h-64">
            <ResponsiveContainer><PieChart><Pie data={byPayment} dataKey="value" nameKey="name" outerRadius={80} label>{byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /><Legend /></PieChart></ResponsiveContainer>
          </div>
        </div>
        <Table columns={[
          { key: "Date", label: "Date" }, { key: "Reference", label: "Ref" }, { key: "Customer", label: "Customer" },
          { key: "Branch", label: "Branch" }, { key: "Payment Method", label: "Payment" },
          { key: "Total", label: "Total", align: "right" }, { key: "Profit", label: "Profit", align: "right" },
        ]} rows={rows.map((r) => ({ ...r, Total: formatCurrency(r.Total), Profit: formatCurrency(r.Profit) }))} />
      </Section>
    </>
  );
}

function StockOnHand({ inventory }: { inventory: Inv[] }) {
  const rows = inventory.map((i) => ({
    Name: i.name, SKU: i.sku ?? "", Category: i.category,
    Quantity: i.quantity,
    "Purchase Price": Number(i.purchase_price), "Selling Price": Number(i.selling_price),
    "Stock Value (Cost)": Number(i.purchase_price) * i.quantity,
    "Stock Value (Retail)": Number(i.selling_price) * i.quantity,
    Status: i.status,
  }));
  const totalCost = rows.reduce((s, r) => s + Number(r["Stock Value (Cost)"]), 0);
  const totalRetail = rows.reduce((s, r) => s + Number(r["Stock Value (Retail)"]), 0);

  return (
    <Section title="Stock on hand">
      <ExportBar section="stock_on_hand" rows={rows} />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KPI label="SKUs" value={rows.length.toString()} />
        <KPI label="Value at cost" value={formatCurrency(totalCost)} />
        <KPI label="Value at retail" value={formatCurrency(totalRetail)} />
      </div>
      <Table columns={[
        { key: "Name", label: "Name" }, { key: "SKU", label: "SKU" }, { key: "Category", label: "Category" },
        { key: "Quantity", label: "Qty", align: "right" },
        { key: "Stock Value (Cost)", label: "Value (cost)", align: "right" },
        { key: "Stock Value (Retail)", label: "Value (retail)", align: "right" }, { key: "Status", label: "Status" },
      ]} rows={rows.map((r) => ({ ...r, "Stock Value (Cost)": formatCurrency(r["Stock Value (Cost)"]), "Stock Value (Retail)": formatCurrency(r["Stock Value (Retail)"]) }))} />
    </Section>
  );
}

function LowStock({ inventory }: { inventory: Inv[] }) {
  const rows = inventory.filter((i) => i.status !== "available").map((i) => ({
    Name: i.name, SKU: i.sku ?? "", Category: i.category, Quantity: i.quantity, "Reorder Level": i.reorder_level, Status: i.status,
  }));
  return (
    <Section title="Low / out of stock">
      <ExportBar section="low_stock" rows={rows} />
      <Table columns={[
        { key: "Name", label: "Name" }, { key: "SKU", label: "SKU" }, { key: "Category", label: "Category" },
        { key: "Quantity", label: "Qty", align: "right" }, { key: "Reorder Level", label: "Reorder", align: "right" }, { key: "Status", label: "Status" },
      ]} rows={rows} />
    </Section>
  );
}

function TopProducts({ sales }: { sales: Sale[] }) {
  type Line = { inventory_id?: string; name?: string; category?: string; quantity?: number; price?: number };
  const prodMap = new Map<string, { name: string; qty: number; revenue: number; category: string }>();
  const catMap = new Map<string, { qty: number; revenue: number }>();
  for (const s of sales) {
    const items = Array.isArray(s.items) ? (s.items as Line[]) : [];
    for (const it of items) {
      const name = it.name ?? "Unknown";
      const cat = it.category ?? "Uncategorized";
      const qty = Number(it.quantity ?? 0);
      const rev = qty * Number(it.price ?? 0);
      const ex = prodMap.get(name) ?? { name, qty: 0, revenue: 0, category: cat };
      prodMap.set(name, { ...ex, qty: ex.qty + qty, revenue: ex.revenue + rev });
      const ec = catMap.get(cat) ?? { qty: 0, revenue: 0 };
      catMap.set(cat, { qty: ec.qty + qty, revenue: ec.revenue + rev });
    }
  }
  const products = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue);
  const categories = Array.from(catMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);

  const prodRows = products.map((p) => ({ Product: p.name, Category: p.category, "Units Sold": p.qty, Revenue: p.revenue }));
  const catRows = categories.map((c) => ({ Category: c.name, "Units Sold": c.qty, Revenue: c.revenue }));

  return (
    <>
      <Section title="Top products">
        <ExportBar section="top_products" rows={prodRows} />
        <div className="h-64 mb-4">
          <ResponsiveContainer><BarChart data={products.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="revenue" fill="oklch(0.62 0.21 38)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <Table columns={[{ key: "Product", label: "Product" }, { key: "Category", label: "Category" }, { key: "Units Sold", label: "Units", align: "right" }, { key: "Revenue", label: "Revenue", align: "right" }]} rows={prodRows.map((r) => ({ ...r, Revenue: formatCurrency(r.Revenue) }))} />
      </Section>
      <Section title="Top categories">
        <ExportBar section="top_categories" rows={catRows} />
        <Table columns={[{ key: "Category", label: "Category" }, { key: "Units Sold", label: "Units", align: "right" }, { key: "Revenue", label: "Revenue", align: "right" }]} rows={catRows.map((r) => ({ ...r, Revenue: formatCurrency(r.Revenue) }))} />
      </Section>
    </>
  );
}

function PnL({ sales, returns, damages }: { sales: Sale[]; returns: Ret[]; damages: Damage[] }) {
  const revenue = sales.reduce((s, r) => s + Number(r.total_amount), 0);
  const cogs = sales.reduce((s, r) => s + Number(r.cost_amount), 0);
  const retTotal = returns.reduce((s, r) => s + Number(r.refund_amount), 0);
  const damTotal = damages.reduce((s, r) => s + Number(r.cost_loss), 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - retTotal - damTotal;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const rows = [
    { Metric: "Revenue", Amount: revenue },
    { Metric: "Cost of Goods Sold (COGS)", Amount: -cogs },
    { Metric: "Gross Profit", Amount: grossProfit },
    { Metric: "Returns / Refunds", Amount: -retTotal },
    { Metric: "Damages / Spoilage", Amount: -damTotal },
    { Metric: "Net Profit", Amount: netProfit },
    { Metric: "Margin %", Amount: Number(margin.toFixed(2)) },
  ];

  return (
    <Section title="Profit & Loss">
      <ExportBar section="profit_loss" rows={rows} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Revenue" value={formatCurrency(revenue)} />
        <KPI label="Gross Profit" value={formatCurrency(grossProfit)} />
        <KPI label="Net Profit" value={formatCurrency(netProfit)} tone={netProfit >= 0 ? "success" : "destructive"} />
        <KPI label="Margin" value={margin.toFixed(1) + "%"} tone={margin >= 0 ? "success" : "destructive"} />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.Metric} className="border-t">
                <td className="px-3 py-2.5">{r.Metric}</td>
                <td className={`px-3 py-2.5 text-right font-medium ${r.Metric.includes("Net") ? "text-primary text-base" : ""}`}>{r.Metric === "Margin %" ? `${r.Amount}%` : formatCurrency(r.Amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function DamagesReport({ damages }: { damages: Damage[] }) {
  const rows = damages.map((d) => ({ Date: formatDateTime(d.created_at), Item: d.name, Category: d.category, Quantity: d.quantity, Reason: d.reason, Loss: Number(d.cost_loss) }));
  const total = damages.reduce((s, r) => s + Number(r.cost_loss), 0);
  return (
    <Section title="Damages report">
      <ExportBar section="damages" rows={rows} />
      <KPI label="Total loss" value={formatCurrency(total)} tone="destructive" />
      <div className="mt-4">
        <Table columns={[{ key: "Date", label: "Date" }, { key: "Item", label: "Item" }, { key: "Category", label: "Category" }, { key: "Quantity", label: "Qty", align: "right" }, { key: "Reason", label: "Reason" }, { key: "Loss", label: "Loss", align: "right" }]} rows={rows.map((r) => ({ ...r, Loss: formatCurrency(r.Loss) }))} />
      </div>
    </Section>
  );
}

function ReturnsReport({ returns, inventory }: { returns: Ret[]; inventory: Inv[] }) {
  const invMap = new Map(inventory.map((i) => [i.id, i.name]));
  const rows = returns.map((r) => ({ Date: formatDateTime(r.created_at), Item: r.inventory_id ? invMap.get(r.inventory_id) ?? "—" : "—", Quantity: r.quantity, Reason: r.reason, Refund: Number(r.refund_amount) }));
  const total = returns.reduce((s, r) => s + Number(r.refund_amount), 0);
  return (
    <Section title="Returns report">
      <ExportBar section="returns" rows={rows} />
      <KPI label="Total refunded" value={formatCurrency(total)} />
      <div className="mt-4">
        <Table columns={[{ key: "Date", label: "Date" }, { key: "Item", label: "Item" }, { key: "Quantity", label: "Qty", align: "right" }, { key: "Reason", label: "Reason" }, { key: "Refund", label: "Refund", align: "right" }]} rows={rows.map((r) => ({ ...r, Refund: formatCurrency(r.Refund) }))} />
      </div>
    </Section>
  );
}

function CreditReport({ credit }: { credit: Credit[] }) {
  const rows = credit.map((c) => ({
    Date: formatDate(c.created_at), Buyer: c.buyer_name, Total: Number(c.total),
    Paid: Number(c.amount_paid), Balance: Number(c.balance), Status: c.status, "Due Date": c.due_date ? formatDate(c.due_date) : "",
  }));
  const outstanding = credit.filter((c) => c.status !== "PAID").reduce((s, c) => s + Number(c.balance), 0);
  return (
    <Section title="Credit sales & receivables">
      <ExportBar section="credit_sales" rows={rows} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <KPI label="Total credit" value={formatCurrency(credit.reduce((s, c) => s + Number(c.total), 0))} />
        <KPI label="Collected" value={formatCurrency(credit.reduce((s, c) => s + Number(c.amount_paid), 0))} tone="success" />
        <KPI label="Outstanding" value={formatCurrency(outstanding)} tone="destructive" />
      </div>
      <Table columns={[
        { key: "Date", label: "Date" }, { key: "Buyer", label: "Buyer" },
        { key: "Total", label: "Total", align: "right" }, { key: "Paid", label: "Paid", align: "right" },
        { key: "Balance", label: "Balance", align: "right" }, { key: "Status", label: "Status" }, { key: "Due Date", label: "Due" },
      ]} rows={rows.map((r) => ({ ...r, Total: formatCurrency(r.Total), Paid: formatCurrency(r.Paid), Balance: formatCurrency(r.Balance) }))} />
    </Section>
  );
}

function StaffPerf({ sales, profiles }: { sales: Sale[]; profiles: Profile[] }) {
  const map = new Map<string, { revenue: number; tx: number }>();
  for (const s of sales) {
    const k = s.added_by ?? "unknown";
    const ex = map.get(k) ?? { revenue: 0, tx: 0 };
    map.set(k, { revenue: ex.revenue + Number(s.total_amount), tx: ex.tx + 1 });
  }
  const profMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const rows = Array.from(map.entries()).map(([id, v]) => ({
    Staff: profMap.get(id) ?? "Unknown", Transactions: v.tx, Revenue: v.revenue, "Avg Ticket": v.tx ? v.revenue / v.tx : 0,
  })).sort((a, b) => b.Revenue - a.Revenue);
  return (
    <Section title="Staff performance">
      <ExportBar section="staff_performance" rows={rows} />
      <div className="h-64 mb-4">
        <ResponsiveContainer><BarChart data={rows.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="Staff" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="Revenue" fill="oklch(0.62 0.21 38)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
      <Table columns={[{ key: "Staff", label: "Staff" }, { key: "Transactions", label: "Transactions", align: "right" }, { key: "Revenue", label: "Revenue", align: "right" }, { key: "Avg Ticket", label: "Avg Ticket", align: "right" }]} rows={rows.map((r) => ({ ...r, Revenue: formatCurrency(r.Revenue), "Avg Ticket": formatCurrency(r["Avg Ticket"]) }))} />
    </Section>
  );
}

function BranchCompare({ sales, branches }: { sales: Sale[]; branches: Branch[] }) {
  const map = new Map<string, { revenue: number; tx: number }>();
  for (const s of sales) {
    const k = s.branch_id ?? "unassigned";
    const ex = map.get(k) ?? { revenue: 0, tx: 0 };
    map.set(k, { revenue: ex.revenue + Number(s.total_amount), tx: ex.tx + 1 });
  }
  const brMap = new Map(branches.map((b) => [b.id, b.name]));
  const rows = Array.from(map.entries()).map(([id, v]) => ({
    Branch: brMap.get(id) ?? "Unassigned", Transactions: v.tx, Revenue: v.revenue, "Avg Ticket": v.tx ? v.revenue / v.tx : 0,
  })).sort((a, b) => b.Revenue - a.Revenue);
  return (
    <Section title="Branch comparison">
      <ExportBar section="branch_comparison" rows={rows} />
      <div className="h-64 mb-4">
        <ResponsiveContainer><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="Branch" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="Revenue" fill="oklch(0.62 0.21 38)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
      <Table columns={[{ key: "Branch", label: "Branch" }, { key: "Transactions", label: "Transactions", align: "right" }, { key: "Revenue", label: "Revenue", align: "right" }, { key: "Avg Ticket", label: "Avg Ticket", align: "right" }]} rows={rows.map((r) => ({ ...r, Revenue: formatCurrency(r.Revenue), "Avg Ticket": formatCurrency(r["Avg Ticket"]) }))} />
    </Section>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold font-display ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
