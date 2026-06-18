import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/credit-sales")({
  head: () => ({ meta: [{ title: "Credit Sales · Stockly" }] }),
  component: CreditSalesPage,
});

type Credit = { id: string; buyer_name: string; buyer_phone: string | null; quantity: number; total: number; amount_paid: number; balance: number; status: "PENDING" | "PARTIAL" | "PAID"; due_date: string | null; created_at: string; inventory_id: string | null };
type Inv = { id: string; name: string; quantity: number; selling_price: number; store_id: string; branch_id: string | null };

function CreditSalesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<Credit | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["credit-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_sales").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Credit[];
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv-for-credit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("id, name, quantity, selling_price, store_id, branch_id").gt("quantity", 0);
      if (error) throw error;
      return data as Inv[];
    },
  });

  const outstanding = items.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.balance), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Credit Sales</h1>
          <p className="text-muted-foreground text-sm">{items.length} records · {formatCurrency(outstanding)} outstanding</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Record credit sale</Button></DialogTrigger>
          <NewDialog inventory={inv} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["credit-sales"] }); qc.invalidateQueries({ queryKey: ["inv-for-credit"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); }} />
        </Dialog>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Buyer</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Paid</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground"><CreditCard className="h-5 w-5 inline mr-2" />No credit sales yet</td></tr>}
              {items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.buyer_name}</p>
                    {c.buyer_phone && <p className="text-xs text-muted-foreground">{c.buyer_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{c.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(c.total)}</td>
                  <td className="px-4 py-3 text-right text-success">{formatCurrency(c.amount_paid)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.balance)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.due_date ? formatDate(c.due_date) : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3 text-right">{c.status !== "PAID" && <Button size="sm" variant="outline" onClick={() => setPaying(c)}>Pay</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        {paying && <PayDialog row={paying} onClose={() => { setPaying(null); qc.invalidateQueries({ queryKey: ["credit-sales"] }); }} />}
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: Credit["status"] }) {
  const map = {
    PAID: "bg-success/10 text-success",
    PARTIAL: "bg-warning/15 text-warning-foreground",
    PENDING: "bg-destructive/10 text-destructive",
  } as const;
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${map[status]}`}>{status}</span>;
}

function NewDialog({ inventory, onClose }: { inventory: Inv[]; onClose: () => void }) {
  const [invId, setInvId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const item = inventory.find((i) => i.id === invId);
  const total = item ? Number(item.selling_price) * qty : 0;
  const balance = total - amountPaid;

  const save = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Pick an item");
      if (qty < 1 || qty > item.quantity) throw new Error("Invalid quantity");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const status = balance <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING";
      const { error } = await supabase.from("credit_sales").insert({
        inventory_id: item.id, buyer_name: buyerName, buyer_phone: buyerPhone || null,
        quantity: qty, price: item.selling_price, total, amount_paid: amountPaid, balance, status,
        due_date: dueDate || null, store_id: item.store_id, branch_id: item.branch_id, added_by: user.id,
      });
      if (error) throw error;
      const { error: upErr } = await supabase.from("inventories").update({ quantity: item.quantity - qty }).eq("id", item.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => { toast.success("Credit sale recorded"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New credit sale</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Buyer name</Label><Input required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} /></div>
        </div>
        <div>
          <Label>Item</Label>
          <Select value={invId} onValueChange={setInvId}>
            <SelectTrigger><SelectValue placeholder="Pick item…" /></SelectTrigger>
            <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quantity</Label><Input type="number" min="1" value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div><Label>Amount paid</Label><Input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(+e.target.value)} /></div>
        </div>
        <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div className="flex justify-between text-sm border-t pt-3"><span>Total</span><span className="font-semibold">{formatCurrency(total)}</span></div>
        <div className="flex justify-between text-sm"><span>Balance</span><span className="font-semibold text-destructive">{formatCurrency(balance)}</span></div>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function PayDialog({ row, onClose }: { row: Credit; onClose: () => void }) {
  const [amount, setAmount] = useState(Number(row.balance));
  const save = useMutation({
    mutationFn: async () => {
      const newPaid = Number(row.amount_paid) + amount;
      const newBalance = Number(row.total) - newPaid;
      const status = newBalance <= 0 ? "PAID" : "PARTIAL";
      const { error } = await supabase.from("credit_sales").update({ amount_paid: newPaid, balance: Math.max(0, newBalance), status }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment recorded"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Record payment from {row.buyer_name}</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-muted-foreground">Outstanding balance: <span className="font-semibold text-foreground">{formatCurrency(row.balance)}</span></p>
        <div><Label>Amount</Label><Input type="number" step="0.01" min="0.01" max={row.balance} value={amount} onChange={(e) => setAmount(+e.target.value)} required /></div>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Record"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
