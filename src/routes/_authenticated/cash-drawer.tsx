import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Lock, Unlock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cash-drawer")({
  head: () => ({ meta: [{ title: "Cash Drawer · Stockly" }] }),
  component: CashDrawerPage,
});

type Session = {
  id: string; opening_float: number; counted_cash: number | null; expected_cash: number | null; variance: number | null;
  cash_sales: number; card_sales: number; transfer_sales: number; other_sales: number; total_sales: number; expenses_paid: number;
  notes: string | null; opened_at: string; closed_at: string | null; status: string;
};

function CashDrawerPage() {
  const qc = useQueryClient();
  const [opening, setOpening] = useState(0);
  const [counted, setCounted] = useState(0);
  const [notes, setNotes] = useState("");

  const { data: open } = useQuery({
    queryKey: ["cash-open"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("cash_sessions").select("*").eq("cashier_id", user.id).eq("status", "open").maybeSingle();
      return data as Session | null;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["cash-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_sessions").select("*").order("opened_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as Session[];
    },
  });

  const openSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("open_cash_session", { _opening_float: opening });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session opened"); setOpening(0); qc.invalidateQueries({ queryKey: ["cash-open"] }); qc.invalidateQueries({ queryKey: ["cash-history"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeSession = useMutation({
    mutationFn: async () => {
      if (!open) throw new Error("No open session");
      const { error } = await supabase.rpc("close_cash_session", { _session_id: open.id, _counted_cash: counted, _notes: notes });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session closed — Z-report ready"); setCounted(0); setNotes(""); qc.invalidateQueries({ queryKey: ["cash-open"] }); qc.invalidateQueries({ queryKey: ["cash-history"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function printZ(s: Session) {
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return;
    const rows = (a: string, b: string | number) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
    w.document.write(`<!doctype html><html><head><title>Z-Report ${s.id.slice(0,8)}</title>
      <style>body{font-family:ui-monospace,Menlo,monospace;font-size:12px;width:72mm;margin:0 auto;padding:8px}
      h1{font-size:14px;text-align:center;margin:0 0 4px}.row{display:flex;justify-content:space-between;padding:2px 0}.div{border-top:1px dashed #000;margin:6px 0}.b{font-weight:700}</style></head><body>
      <h1>END-OF-DAY Z-REPORT</h1>
      <div class="row"><span>Opened</span><span>${formatDateTime(s.opened_at)}</span></div>
      <div class="row"><span>Closed</span><span>${s.closed_at ? formatDateTime(s.closed_at) : "—"}</span></div>
      <div class="div"></div>
      ${rows("Opening float", formatCurrency(s.opening_float))}
      ${rows("Cash sales", formatCurrency(s.cash_sales))}
      ${rows("Card sales", formatCurrency(s.card_sales))}
      ${rows("Transfer sales", formatCurrency(s.transfer_sales))}
      ${rows("Other sales", formatCurrency(s.other_sales))}
      <div class="div"></div>
      ${rows("TOTAL SALES", formatCurrency(s.total_sales))}
      ${rows("Cash expenses", formatCurrency(s.expenses_paid))}
      <div class="div"></div>
      ${rows("Expected cash", formatCurrency(s.expected_cash ?? 0))}
      ${rows("Counted cash", formatCurrency(s.counted_cash ?? 0))}
      <div class="row b"><span>VARIANCE</span><span>${formatCurrency(s.variance ?? 0)}</span></div>
      ${s.notes ? `<div class="div"></div><div>${s.notes}</div>` : ""}
      <script>setTimeout(()=>window.print(),150)</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Cash Drawer</h1>
        <p className="text-muted-foreground text-sm">Open a session at start of shift, close at end of day for the Z-report.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {!open && (
          <form onSubmit={(e) => { e.preventDefault(); openSession.mutate(); }} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Unlock className="h-4 w-4" /> Open shift</h3>
            <div><Label>Opening float (cash in drawer)</Label><Input type="number" min={0} step="0.01" value={opening || ""} onChange={(e) => setOpening(+e.target.value)} /></div>
            <Button type="submit" variant="hero" className="w-full" disabled={openSession.isPending}>{openSession.isPending ? "Opening…" : "Open session"}</Button>
          </form>
        )}
        {open && (
          <form onSubmit={(e) => { e.preventDefault(); closeSession.mutate(); }} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Close shift</h3>
            <p className="text-xs text-muted-foreground">Open since {formatDateTime(open.opened_at)} · float {formatCurrency(open.opening_float)}</p>
            <div><Label>Counted cash in drawer</Label><Input type="number" min={0} step="0.01" value={counted || ""} onChange={(e) => setCounted(+e.target.value)} required /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button type="submit" variant="hero" className="w-full" disabled={closeSession.isPending}><Banknote className="h-4 w-4" /> {closeSession.isPending ? "Closing…" : "Close & print Z-report"}</Button>
          </form>
        )}

        <div className="rounded-2xl border bg-card shadow-card p-5">
          <h3 className="font-semibold mb-3">Recent sessions</h3>
          <div className="divide-y max-h-[480px] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No sessions yet</p>}
            {history.map((s) => (
              <div key={s.id} className="py-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.status === "open" ? "OPEN" : "Closed"} · {formatCurrency(s.total_sales)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(s.opened_at)} {s.closed_at ? `→ ${formatDateTime(s.closed_at)}` : ""}</p>
                  {s.status === "closed" && <p className="text-xs">Variance: <span className={Math.abs(Number(s.variance ?? 0)) < 0.01 ? "text-success" : "text-warning"}>{formatCurrency(s.variance ?? 0)}</span></p>}
                </div>
                {s.status === "closed" && <Button size="icon" variant="ghost" onClick={() => printZ(s)}><Printer className="h-4 w-4" /></Button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
