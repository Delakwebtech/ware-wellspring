import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/damages")({
  head: () => ({ meta: [{ title: "Damages · Stockly" }] }),
  component: DamagesPage,
});

type Inv = { id: string; name: string; category: string; quantity: number; purchase_price: number; store_id: string; branch_id: string | null };
type Damage = { id: string; name: string; category: string; quantity: number; reason: string; cost_loss: number; created_at: string };

function DamagesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["damages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Damage[];
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv-for-damages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("id, name, category, quantity, purchase_price, store_id, branch_id").gt("quantity", 0).order("name");
      if (error) throw error;
      return data as Inv[];
    },
  });

  const totalLoss = items.reduce((s, d) => s + Number(d.cost_loss), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Damages</h1>
          <p className="text-muted-foreground text-sm">{items.length} records · {formatCurrency(totalLoss)} total loss</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Log damage</Button></DialogTrigger>
          <DamageDialog inventory={inv} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["damages"] }); qc.invalidateQueries({ queryKey: ["inv-for-damages"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); }} />
        </Dialog>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-right px-4 py-3">Loss</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground"><AlertTriangle className="h-5 w-5 inline mr-2" />No damages logged</td></tr>}
              {items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">{d.category}</td>
                  <td className="px-4 py-3 text-right">{d.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{d.reason}</td>
                  <td className="px-4 py-3 text-right text-destructive font-medium">{formatCurrency(d.cost_loss)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DamageDialog({ inventory, onClose }: { inventory: Inv[]; onClose: () => void }) {
  const [invId, setInvId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const item = inventory.find((i) => i.id === invId);

  const save = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Pick an item");
      if (qty < 1 || qty > item.quantity) throw new Error("Invalid quantity");
      const { error } = await supabase.rpc("log_damage", { _inventory_id: item.id, _quantity: qty, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Damage logged"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Log damaged stock</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <Label>Item</Label>
          <Select value={invId} onValueChange={setInvId}>
            <SelectTrigger><SelectValue placeholder="Pick item…" /></SelectTrigger>
            <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity} in stock)</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Quantity damaged</Label><Input type="number" min="1" max={item?.quantity ?? 1} value={qty} onChange={(e) => setQty(+e.target.value)} required /></div>
        <div><Label>Reason</Label><Textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spoiled, expired, broken…" /></div>
        {item && <p className="text-xs text-muted-foreground">Estimated loss: <span className="font-semibold text-destructive">{formatCurrency(Number(item.purchase_price) * qty)}</span></p>}
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
