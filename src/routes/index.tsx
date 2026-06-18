import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Boxes, BarChart3, Receipt, AlertTriangle, Users, Store, ArrowRight,
  Check, Download, ShieldCheck, Zap, FileSpreadsheet, TrendingUp, LayoutDashboard, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stockly — Modern Inventory Management for Growing Retail" },
      { name: "description", content: "Track stock across branches, sell faster, prevent losses, and export every report in CSV or Excel. Built for retail, pharmacies, warehouses and distributors." },
      { property: "og:title", content: "Stockly — Run a tighter store" },
      { property: "og:description", content: "Inventory, sales, damages, credit sales, returns, multi-branch dashboards and exportable reports — in one place." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Boxes, title: "Smart Inventory", desc: "SKUs, categories, reorder levels and auto status (available · low · out-of-stock) across every branch." },
  { icon: Receipt, title: "Point of Sale", desc: "Quick cart, multi-item receipts, cash / card / transfer — stock deducts automatically." },
  { icon: BarChart3, title: "Sectioned Reports", desc: "Ten reporting modules. Filter by date, branch, category — download as CSV or Excel." },
  { icon: AlertTriangle, title: "Damages & Returns", desc: "Log spoiled stock and process refunds against original sales. Your P&L stays honest." },
  { icon: Users, title: "Roles & Permissions", desc: "Superadmin · CEO · Manager · Staff. See only what your role needs to see." },
  { icon: Store, title: "Multi-Branch", desc: "Run one HQ with many branches. Compare performance, route stock, monitor everything." },
];

const modules = [
  "Sales summary by day, method & branch",
  "Stock on hand with valuation",
  "Low stock & out-of-stock watchlist",
  "Top-selling products & categories",
  "Profit & loss (revenue − COGS − returns − damages)",
  "Damages report",
  "Sales returns report",
  "Credit sales / outstanding receivables",
  "Staff performance",
  "Branch comparison",
];

const pricing = [
  { name: "Starter", price: "Free", note: "Single branch · up to 3 users", features: ["Up to 200 SKUs", "Basic dashboard", "CSV export"], cta: "Start free", variant: "outline-brand" as const },
  { name: "Growth", price: "$29", suffix: "/mo", note: "Up to 5 branches · 15 users", features: ["Unlimited SKUs", "All 10 reports", "CSV + Excel export", "Credit sales & returns"], cta: "Start free trial", variant: "hero" as const, highlight: true },
  { name: "Enterprise", price: "Custom", note: "Unlimited branches & users", features: ["Priority support", "Custom roles", "API access", "Onboarding"], cta: "Talk to sales", variant: "outline-brand" as const },
];

const faqs = [
  { q: "Can I run multiple branches?", a: "Yes — create as many branches as you need under one store. Reports can be filtered by branch or compared side-by-side." },
  { q: "Do you support credit sales?", a: "Yes. Log buy-now-pay-later, record partial payments and track outstanding receivables with due dates." },
  { q: "Can I export reports?", a: "Every report section supports one-click CSV and Excel (.xlsx) export with your active filters applied." },
  { q: "Is my data secure?", a: "Row-level security ensures each store only sees its own data. Roles control who can edit what." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <LogoStrip />
      <Features />
      <DashboardPreview />
      <Modules />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-brand grid place-items-center shadow-brand">
            <Boxes className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold font-display tracking-tight">Stockly</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#modules" className="hover:text-foreground">Reports</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild variant="hero" size="sm"><Link to="/auth">Get started</Link></Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Zap className="h-3.5 w-3.5" /> New: sectioned reports with Excel export
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight">
            Run a tighter store with <span className="text-gradient-brand">Stockly</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            One platform for inventory, sales, damages, credit and reporting — across every branch.
            Built for retailers, pharmacies, warehouses and distributors.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="xl"><Link to="/auth">Start free <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline-brand" size="xl"><a href="#features">See features</a></Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · 14-day trial of Growth</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 mx-auto max-w-5xl"
        >
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 text-xs text-muted-foreground">app.stockly.io / dashboard</span>
            </div>
            <MockDashboard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MockDashboard() {
  const kpis = [
    { label: "Revenue (30d)", value: "₦8,420,500", delta: "+12.4%", positive: true },
    { label: "Units sold", value: "2,184", delta: "+8.1%", positive: true },
    { label: "Profit margin", value: "31.2%", delta: "+1.8%", positive: true },
    { label: "Low stock items", value: "14", delta: "−3", positive: true },
  ];
  return (
    <div className="p-6 bg-background">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-bold font-display">{k.value}</p>
            <p className={`mt-1 text-xs ${k.positive ? "text-success" : "text-destructive"}`}>{k.delta} vs prev</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold mb-3">Sales trend</p>
          <svg viewBox="0 0 400 120" className="w-full h-32">
            <defs>
              <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.21 38)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="oklch(0.62 0.21 38)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,90 C40,70 70,80 100,60 C140,40 170,55 200,50 C240,40 270,30 300,25 C340,20 370,15 400,10 L400,120 L0,120 Z" fill="url(#g)" />
            <path d="M0,90 C40,70 70,80 100,60 C140,40 170,55 200,50 C240,40 270,30 300,25 C340,20 370,15 400,10" fill="none" stroke="oklch(0.62 0.21 38)" strokeWidth="2.5" />
          </svg>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold mb-3">Top categories</p>
          <div className="space-y-2.5">
            {[["Beverages", 78], ["Snacks", 64], ["Household", 41], ["Personal care", 28]].map(([n, v]) => (
              <div key={n as string}>
                <div className="flex justify-between text-xs"><span>{n}</span><span className="text-muted-foreground">{v}%</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoStrip() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">Built for businesses that move stock</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-sm font-semibold font-display text-muted-foreground/80">
          <div>Retail Chains</div><div>Pharmacies</div><div>Warehouses</div><div>Distributors</div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold font-display">Everything you need to run inventory</h2>
          <p className="mt-3 text-muted-foreground">From the storeroom to the till to the boardroom — Stockly covers the entire chain.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center shadow-brand">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold font-display">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const items = [
    { icon: LayoutDashboard, title: "Live dashboard", desc: "KPIs update as sales come in. Spot trends, slumps and slow movers instantly." },
    { icon: FileSpreadsheet, title: "Export anything", desc: "Every report exports to CSV and Excel — filter first, download second." },
    { icon: TrendingUp, title: "Real profit", desc: "P&L is calculated after returns and damages — not just topline revenue." },
    { icon: ShieldCheck, title: "Role-based access", desc: "Staff can sell. Managers can restock. CEOs see everything." },
    { icon: Smartphone, title: "Works on any screen", desc: "Run the till on a tablet, check reports on your phone." },
    { icon: Download, title: "Own your data", desc: "Pull a full export whenever you want — no lock-in." },
  ];
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display">A dashboard that earns its keep</h2>
          <p className="mt-4 text-muted-foreground">Stop assembling spreadsheets at the end of the month. Stockly gives you the numbers in real time and lets you take them home.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {items.map((i) => (
              <div key={i.title} className="flex gap-3">
                <i.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{i.title}</p>
                  <p className="text-sm text-muted-foreground">{i.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section id="modules" className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <FileSpreadsheet className="h-3.5 w-3.5" /> 10 report sections · CSV & Excel
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display">Every report you'll actually use</h2>
          <p className="mt-3 text-muted-foreground">Filter by date range, branch and category. Download in one click.</p>
        </div>
        <div className="mx-auto max-w-4xl grid sm:grid-cols-2 gap-3">
          {modules.map((m) => (
            <div key={m} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
              <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center"><Check className="h-4 w-4 text-primary" /></div>
              <span className="text-sm">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold font-display">Simple, honest pricing</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade only when you outgrow it.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {pricing.map((p) => (
            <div key={p.name}
              className={`rounded-2xl border bg-card p-7 shadow-card flex flex-col ${p.highlight ? "border-primary shadow-glow scale-[1.02]" : ""}`}>
              {p.highlight && <span className="self-start mb-3 rounded-full bg-gradient-brand text-primary-foreground text-xs font-semibold px-3 py-1">Most popular</span>}
              <h3 className="text-xl font-bold font-display">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.note}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-bold font-display">{p.price}</span>
                {p.suffix && <span className="text-muted-foreground mb-1">{p.suffix}</span>}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Button asChild variant={p.variant} size="lg" className="mt-7"><Link to="/auth">{p.cta}</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl sm:text-4xl font-bold font-display text-center mb-12">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border bg-card px-5 py-4 shadow-card">
              <summary className="cursor-pointer flex items-center justify-between font-medium">
                {f.q}
                <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl bg-gradient-brand p-10 md:p-16 text-center shadow-glow">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-primary-foreground">Ready to take control of your stock?</h2>
          <p className="mt-3 text-primary-foreground/90">Set up your store in under five minutes.</p>
          <div className="mt-7">
            <Button asChild size="xl" className="bg-background text-primary hover:bg-background/90">
              <Link to="/auth">Get started free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-brand grid place-items-center">
            <Boxes className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">Stockly</span>
          <span>· © {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
