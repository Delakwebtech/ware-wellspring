import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Plus, RotateCw, Ban } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  component: SubscriptionsPage,
});

type Row = {
  store_id: string;
  store_name: string;
  sub_id: string | null;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  amount: number | null;
  currency: string | null;
};

function SubscriptionsPage() {
  const qc = useQueryClient();
  const [renewing, setRenewing] = useState<Row | null>(null);

  const { data: isSuper } = useQuery({
    queryKey: ["is-super"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "superadmin").maybeSingle();
      return !!data;
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["all-subs"],
    enabled: !!isSuper,
    queryFn: async () => {
      const { data: stores } = await supabase.from("stores").select("id, name, currency").order("created_at");
      const { data: subs } = await supabase.from("store_subscriptions" as any).select("*");
      const map = new Map<string, any>();
      (subs ?? []).forEach((s: any) => map.set(s.store_id, s));
      return (stores ?? []).map((st: any) => {
        const s = map.get(st.id);
        return {
          store_id: st.id,
          store_name: st.name,
          sub_id: s?.id ?? null,
          plan: s?.plan ?? null,
          status: s?.status ?? null,
          started_at: s?.started_at ?? null,
          expires_at: s?.expires_at ?? null,
          amount: s?.amount ?? null,
          currency: s?.currency ?? st.currency,
        } as Row;
      });
    },
  });

  const suspend = useMutation({
    mutationFn: async (r: Row) => {
      if (!r.sub_id) throw new Error("No subscription");
      const { error } = await supabase.from("store_subscriptions" as any).update({ status: "suspended" }).eq("id", r.sub_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-subs"] }); toast.success("Suspended"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isSuper === false) {
    return <AppShell><div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Only superadmins can manage subscriptions.</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><CreditCard className="h-6 w-6" /> Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage every store's plan, expiry and payments.</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
            {rows?.map((r) => (
              <TableRow key={r.store_id}>
                <TableCell className="font-medium">{r.store_name}</TableCell>
                <TableCell className="capitalize">{r.plan ?? "—"}</TableCell>
                <TableCell>
                  {r.status ? <Badge variant={r.status === "active" ? "default" : r.status === "suspended" ? "destructive" : "secondary"}>{r.status}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.started_at ? new Date(r.started_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setRenewing(r)}><RotateCw className="h-3.5 w-3.5 mr-1" /> Renew</Button>
                  {r.sub_id && r.status !== "suspended" && (
                    <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => suspend.mutate(r)}><Ban className="h-3.5 w-3.5 mr-1" /> Suspend</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RenewDialog row={renewing} onClose={() => setRenewing(null)} onDone={() => { qc.invalidateQueries({ queryKey: ["all-subs"] }); setRenewing(null); }} />
    </AppShell>
  );
}

function RenewDialog({ row, onClose, onDone }: { row: Row | null; onClose: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState("monthly");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!row) return;
    setSaving(true);
    try {
      const now = new Date();
      const base = row.expires_at && new Date(row.expires_at) > now ? new Date(row.expires_at) : now;
      const expires = new Date(base);
      if (plan === "yearly") expires.setFullYear(expires.getFullYear() + months);
      else if (plan === "monthly") expires.setMonth(expires.getMonth() + months);
      else if (plan === "lifetime") expires.setFullYear(expires.getFullYear() + 100);

      let subId = row.sub_id;
      const payload = { plan, status: "active", started_at: now.toISOString(), expires_at: plan === "lifetime" ? null : expires.toISOString(), amount: Number(amount) || 0, currency: row.currency ?? "NGN" };
      if (subId) {
        const { error } = await supabase.from("store_subscriptions" as any).update(payload).eq("id", subId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("store_subscriptions" as any).insert({ store_id: row.store_id, ...payload }).select("id").maybeSingle();
        if (error) throw error;
        subId = (data as any)?.id ?? null;
      }
      if (subId && Number(amount) > 0) {
        await supabase.from("subscription_payments" as any).insert({
          subscription_id: subId, store_id: row.store_id, amount: Number(amount), currency: row.currency ?? "NGN",
          method, reference: reference || null,
        });
      }
      toast.success("Subscription renewed");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Renew failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Renew — {row?.store_name}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Plan</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="trial">Trial</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div><Label>Periods</Label><Input type="number" min={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
          </div>
          <div><Label>Amount ({row?.currency})</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Method</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option>
              </select>
            </div>
            <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}><Plus className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Renew"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
