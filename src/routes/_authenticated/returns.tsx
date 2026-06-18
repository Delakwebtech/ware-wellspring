import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/returns")({
  head: () => ({ meta: [{ title: "Returns · Stockly" }] }),
  component: ReturnsPage,
});

type Ret = { id: string; quantity: number; reason: string; refund_amount: number; created_at: string; inventory_id: string | null; sale_id: string | null };
type Inv = { id: string; name: string; quantity: number; selling_price: number; store_id: string; branch_id: string | null };

function ReturnsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["returns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_returns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ret[];
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv-for-returns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("id, name, quantity, selling_price, store_id, branch_id").order("name");
      if (error) throw error;
      return data as Inv[];
    },
  });

  const totalRefund = items.reduce((s, r) => s + Number(r.refund_amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Sales Returns</h1>
          <p className="text-muted-foreground text-sm">{items.length} returns · {formatCurrency(totalRefund)} refunded</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Process return</Button></DialogTrigger>
          <ReturnDialog inventory={inv} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["inv-for-returns"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); }} />
        </Dialog>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-right px-4 py-3">Refund</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground"><RotateCcw className="h-5 w-5 inline mr-2" />No returns yet</td></tr>}
              {items.map((r) => {
                const name = inv.find((i) => i.id === r.inventory_id)?.name ?? "—";
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-right">{r.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.refund_amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReturnDialog({ inventory, onClose }: { inventory: Inv[]; onClose: () => void }) {
  const [invId, setInvId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const item = inventory.find((i) => i.id === invId);
  const refund = item ? Number(item.selling_price) * qty : 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Pick an item");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("sales_returns").insert({
        inventory_id: item.id, quantity: qty, reason, refund_amount: refund,
        store_id: item.store_id, branch_id: item.branch_id, processed_by: user.id,
      });
      if (error) throw error;
      // restock
      const { error: upErr } = await supabase.from("inventories").update({ quantity: item.quantity + qty }).eq("id", item.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => { toast.success("Return processed"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Process return</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <Label>Item</Label>
          <Select value={invId} onValueChange={setInvId}>
            <SelectTrigger><SelectValue placeholder="Pick item…" /></SelectTrigger>
            <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Quantity</Label><Input type="number" min="1" value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
        <div><Label>Reason</Label><Textarea required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        {item && <p className="text-xs text-muted-foreground">Refund: <span className="font-semibold text-foreground">{formatCurrency(refund)}</span></p>}
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Process"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
