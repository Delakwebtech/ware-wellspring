import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Purchases · Stockly" }] }),
  component: PurchasesPage,
});

type Receipt = { id: string; quantity: number; unit_cost: number; total_cost: number; reference: string | null; created_at: string; inventory_id: string; supplier_id: string | null };
type Inv = { id: string; name: string; sku: string | null; category: string };
type Supplier = { id: string; name: string };

function PurchasesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["stock-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_receipts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Receipt[];
    },
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["inv-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("id, name, sku, category").order("name");
      if (error) throw error;
      return data as Inv[];
    },
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const invMap = new Map(inventory.map((i) => [i.id, i]));
  const supMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const totalCost = receipts.reduce((s, r) => s + Number(r.total_cost), 0);
  const totalUnits = receipts.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Purchases & Stock Receiving</h1>
          <p className="text-muted-foreground text-sm">{receipts.length} receipts · {totalUnits} units · {formatCurrency(totalCost)} spent</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Receive stock</Button></DialogTrigger>
          <ReceiveDialog inventory={inventory} suppliers={suppliers} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["stock-receipts"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }} />
        </Dialog>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Unit cost</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && receipts.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground"><PackagePlus className="h-5 w-5 inline mr-2" />No receipts yet. Receive stock when a supplier delivers.</td></tr>}
              {receipts.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{invMap.get(r.inventory_id)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.supplier_id ? supMap.get(r.supplier_id) ?? "—" : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.quantity}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(r.unit_cost)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.total_cost)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReceiveDialog({ inventory, suppliers, onClose }: { inventory: Inv[]; suppliers: Supplier[]; onClose: () => void }) {
  const [invId, setInvId] = useState("");
  const [supId, setSupId] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!invId) throw new Error("Pick an item");
      if (qty <= 0) throw new Error("Quantity must be positive");
      const { error } = await supabase.rpc("record_stock_receipt", {
        _inventory_id: invId,
        _supplier_id: (supId || null) as unknown as string,
        _quantity: qty,
        _unit_cost: cost,
        _reference: ref,
        _notes: notes,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stock received — inventory updated"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Receive stock</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <Label>Item</Label>
          <Select value={invId} onValueChange={setInvId}>
            <SelectTrigger><SelectValue placeholder="Pick item…" /></SelectTrigger>
            <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.sku ? ` · ${i.sku}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supplier (optional)</Label>
          <Select value={supId} onValueChange={setSupId}>
            <SelectTrigger><SelectValue placeholder="Pick supplier…" /></SelectTrigger>
            <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quantity received</Label><Input type="number" min="1" value={qty} onChange={(e) => setQty(+e.target.value)} required /></div>
          <div><Label>Unit cost</Label><Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(+e.target.value)} required /></div>
        </div>
        <div><Label>Reference / invoice no.</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. PO-1234" /></div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">Inventory quantity will increase by <b>{qty}</b>. Purchase price updates via moving-average costing.</p>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Receive"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
