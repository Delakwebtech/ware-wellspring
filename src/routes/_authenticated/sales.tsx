import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, Receipt as ReceiptIcon, ScanLine, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { printReceipt, type ReceiptData } from "@/lib/print-receipt";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales · Stockly" }] }),
  component: SalesPage,
});

type Inv = { id: string; name: string; sku: string | null; category: string; quantity: number; purchase_price: number; selling_price: number; store_id: string; branch_id: string | null };
type CartLine = { inventory_id: string; name: string; category: string; price: number; cost: number; quantity: number; available: number };
type SaleRow = { id: string; sale_ref: string; total_amount: number; payment_method: string; customer_name: string | null; created_at: string };

function SalesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customer, setCustomer] = useState("");

  const { data: meBranch } = useQuery({
    queryKey: ["my-branch"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("branch_id, store_id").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inventory-for-sales", meBranch?.branch_id],
    queryFn: async () => {
      let q = supabase.from("inventories").select("id, name, sku, category, quantity, purchase_price, selling_price, store_id, branch_id").gt("quantity", 0).order("name");
      if (meBranch?.branch_id) q = q.or(`branch_id.eq.${meBranch.branch_id},branch_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Inv[];
    },
  });

  const { data: recentSales = [] } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("id, sale_ref, total_amount, payment_method, customer_name, created_at").order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data as SaleRow[];
    },
  });

  const filtered = inv.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  function addToCart(i: Inv) {
    setCart((c) => {
      const ex = c.find((l) => l.inventory_id === i.id);
      if (ex) {
        if (ex.quantity >= i.quantity) { toast.warning("Stock limit reached"); return c; }
        return c.map((l) => l.inventory_id === i.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...c, { inventory_id: i.id, name: i.name, category: i.category, price: Number(i.selling_price), cost: Number(i.purchase_price), quantity: 1, available: i.quantity }];
    });
  }

  const checkout = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error("Cart is empty");
      const items = cart.map((c) => ({ inventory_id: c.inventory_id, quantity: c.quantity }));
      const { data, error } = await supabase.rpc("record_sale", {
        _items: items,
        _payment_method: paymentMethod,
        ...(customer ? { _customer_name: customer } : {}),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("Sale recorded");
      setCart([]); setCustomer("");
      qc.invalidateQueries({ queryKey: ["inventory-for-sales"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["recent-sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground text-sm">Pick items, build a cart, check out.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Catalogue */}
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-card p-5">
          <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-6 text-center">No items in stock</p>}
            {filtered.map((i) => (
              <button key={i.id} onClick={() => addToCart(i)} className="text-left rounded-xl border p-3 hover:border-primary hover:shadow-glow transition-all">
                <p className="font-medium text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.category} · {i.quantity} in stock</p>
                <p className="mt-2 font-semibold text-primary">{formatCurrency(i.selling_price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="rounded-2xl border bg-card shadow-card p-5 flex flex-col">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><ShoppingCart className="h-4 w-4" /> Cart ({cart.length})</h3>
          <div className="flex-1 overflow-y-auto divide-y min-h-[200px]">
            {cart.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Cart is empty</p>}
            {cart.map((l) => (
              <div key={l.inventory_id} className="py-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(l.price)} × {l.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setCart((c) => c.map((x) => x.inventory_id === l.inventory_id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <Button size="icon" variant="ghost" onClick={() => setCart((c) => c.map((x) => x.inventory_id === l.inventory_id ? { ...x, quantity: Math.min(x.available, x.quantity + 1) } : x))}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setCart((c) => c.filter((x) => x.inventory_id !== l.inventory_id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3 space-y-3">
            <div>
              <Label>Customer (optional)</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="mobile">Mobile money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between text-lg font-bold font-display">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button variant="hero" className="w-full" size="lg" disabled={!cart.length || checkout.isPending} onClick={() => checkout.mutate()}>
              {checkout.isPending ? "Processing…" : "Complete sale"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><ReceiptIcon className="h-4 w-4" /> Recent sales</h3>
        <div className="divide-y">
          {recentSales.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No sales yet</p>}
          {recentSales.map((s) => (
            <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{s.sale_ref} · {s.customer_name || "Walk-in"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)} · {s.payment_method}</p>
              </div>
              <span className="font-semibold">{formatCurrency(s.total_amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
