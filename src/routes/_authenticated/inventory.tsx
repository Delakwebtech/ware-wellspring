import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Stockly" }] }),
  component: InventoryPage,
});

type Item = {
  id: string; name: string; sku: string | null; barcode: string | null; category: string;
  quantity: number; reorder_level: number; purchase_price: number; selling_price: number;
  status: "available" | "low" | "out_of_stock"; store_id: string; branch_id: string | null;
};

function InventoryPage() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Deleted"); },
  });

  const filtered = items.filter((i) =>
    !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">{items.length} items · {items.filter((i) => i.status === "low").length} low · {items.filter((i) => i.status === "out_of_stock").length} out of stock</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-64" placeholder="Search name, SKU, category" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add item</Button></DialogTrigger>
            <ItemDialog editing={editing} onClose={() => { setOpen(false); setEditing(null); }} />
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Purchase</th>
                <th className="text-right px-4 py-3">Selling</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground"><AlertCircle className="h-5 w-5 inline mr-2" />No items yet. Click "Add item" to get started.</td></tr>}
              {filtered.map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.sku ?? "—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-muted text-xs">{i.category}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{i.quantity}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(i.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(i.selling_price)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete " + i.name + "?")) deleteMut.mutate(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Item["status"] }) {
  const map = {
    available: ["bg-success/10 text-success", "Available"],
    low: ["bg-warning/15 text-warning-foreground", "Low"],
    out_of_stock: ["bg-destructive/10 text-destructive", "Out of stock"],
  } as const;
  const [cls, label] = map[status];
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${cls}`}>{label}</span>;
}

function ItemDialog({ editing, onClose }: { editing: Item | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    sku: editing?.sku ?? "",
    category: editing?.category ?? "General",
    quantity: editing?.quantity ?? 0,
    reorder_level: editing?.reorder_level ?? 5,
    purchase_price: editing?.purchase_price ?? 0,
    selling_price: editing?.selling_price ?? 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("store_id, branch_id").eq("id", user.id).maybeSingle();
      if (!profile?.store_id) throw new Error("No store assigned");
      const payload = {
        ...form,
        quantity: Number(form.quantity), reorder_level: Number(form.reorder_level),
        purchase_price: Number(form.purchase_price), selling_price: Number(form.selling_price),
        store_id: profile.store_id, branch_id: profile.branch_id, added_by: user.id,
      };
      if (editing) {
        const { error } = await supabase.from("inventories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(editing ? "Updated" : "Added");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>
          <div><Label>Reorder level</Label><Input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: +e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Purchase price</Label><Input type="number" step="0.01" min="0" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} /></div>
          <div><Label>Selling price</Label><Input type="number" step="0.01" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} /></div>
        </div>
        <DialogFooter className="mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
