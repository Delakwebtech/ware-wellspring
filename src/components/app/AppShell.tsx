import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Boxes, Receipt, AlertTriangle, RotateCcw, CreditCard,
  Users, BarChart3, Settings as SettingsIcon, LogOut, Menu, Building2,
  Truck, PackagePlus, ScrollText, ArrowLeftRight, Wallet, Banknote, UserCircle2, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setActiveCurrency } from "@/lib/format";
import { NotificationBell } from "./NotificationBell";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/purchases", label: "Purchases", icon: PackagePlus },
  { to: "/sales", label: "Point of Sale", icon: Receipt },
  { to: "/credit-sales", label: "Credit Sales", icon: CreditCard },
  { to: "/returns", label: "Returns", icon: RotateCcw },
  { to: "/damages", label: "Damages", icon: AlertTriangle },
  { to: "/transfers", label: "Stock Transfers", icon: ArrowLeftRight },
  { to: "/customers", label: "Customers", icon: UserCircle2 },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/cash-drawer", label: "Cash Drawer", icon: Banknote },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/invites", label: "Invite Staff", icon: Mail },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;


export default function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: profile }, { data: roles }, { data: store }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("stores").select("*").limit(1).maybeSingle(),
      ]);
      return { user, profile, roles: (roles ?? []).map((r) => r.role), store };
    },
  });

  useEffect(() => { setActiveCurrency(me?.store?.currency); }, [me?.store?.currency]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/dashboard" className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-brand grid place-items-center shadow-brand">
          <Boxes className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold">Stockly</span>
      </Link>
      <div className="px-3 py-4 border-b border-sidebar-border">
        <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60 px-2">Store</p>
        <p className="px-2 mt-1 text-sm font-semibold truncate">{me?.store?.name ?? "—"}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((n) => {
          const active = pathname === n.to || pathname.startsWith(n.to + "/");
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground font-semibold">
            {(me?.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{me?.profile?.full_name}</p>
            <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{me?.roles?.[0] ?? "staff"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">{Sidebar}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative">{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur border-b">
          <div className="flex items-center gap-2 lg:invisible">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></Button>
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="h-7 w-7 rounded-md bg-gradient-brand grid place-items-center"><Boxes className="h-4 w-4 text-primary-foreground" /></div>
              <span className="font-display font-bold">Stockly</span>
            </Link>
          </div>
          <NotificationBell />
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
