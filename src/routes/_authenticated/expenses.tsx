import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses · Stockly" }] }),
  component: ExpensesPage,
});

const CATEGORIES = ["Rent", "Utilities", "Salaries", "Supplies", "Transport", "Marketing", "Maintenance", "Bank Fees", "Other"];

type Expense = { id: string; category: string; description: string | null; amount: number; paid_via: string; expense_date: string; created_at: string; receipt_url?: string | null };

function ExpensesPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ category: "Rent", description: "", amount: 0, paid_via: "cash", expense_date: today });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Expense[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.amount || form.amount <= 0) throw new Error("Enter an amount");
      const { data: rpcData, error } = await supabase.rpc("record_expense", {
        _category: form.category,
        _description: form.description,
        _amount: form.amount,
        _paid_via: form.paid_via,
        _expense_date: form.expense_date,
      });
      if (error) throw error;
      if (receiptFile) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const ext = receiptFile.name.split(".").pop() || "bin";
          const path = `${user.id}/expense-${Date.now()}.${ext}`;
          const up = await supabase.storage.from("receipts").upload(path, receiptFile, { contentType: receiptFile.type });
          if (!up.error && rpcData) {
            const signed = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
            if (signed.data) {
              await supabase.from("expenses").update({ receipt_url: signed.data.signedUrl }).eq("id", rpcData as string);
            }
          }
        }
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast.success("Expense recorded");
      setForm({ ...form, description: "", amount: 0 });
      setReceiptFile(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => { setUploading(false); toast.error(e.message); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = expenses
    .filter((e) => e.expense_date.slice(0, 7) === today.slice(0, 7))
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Expenses</h1>
        <p className="text-muted-foreground text-sm">Track operating costs so your P&amp;L reflects reality.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card shadow-card p-5">
          <p className="text-xs uppercase text-muted-foreground">This month</p>
          <p className="text-2xl font-bold font-display mt-1">{formatCurrency(monthTotal)}</p>
        </div>
        <div className="rounded-2xl border bg-card shadow-card p-5">
          <p className="text-xs uppercase text-muted-foreground">All-time (last 200)</p>
          <p className="text-2xl font-bold font-display mt-1">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New expense</h3>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" min={0} step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required /></div>
            <div>
              <Label>Paid via</Label>
              <Select value={form.paid_via} onValueChange={(v) => setForm({ ...form, paid_via: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={add.isPending}>{add.isPending ? "Saving…" : "Record expense"}</Button>
        </form>

        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-card p-5">
          <h3 className="font-semibold mb-3">Recent expenses</h3>
          <div className="divide-y max-h-[560px] overflow-y-auto">
            {expenses.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No expenses yet</p>}
            {expenses.map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{e.category}{e.description ? ` — ${e.description}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.expense_date)} · {e.paid_via}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(e.amount)}</span>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete expense?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
