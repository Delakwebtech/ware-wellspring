import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({ meta: [{ title: "Stock Transfers · Stockly" }] }),
  component: TransfersPage,
});

type Inv = { id: string; name: string; sku: string | null; quantity: number; branch_id: string | null };
type Branch = { id: string; name: string };
type Transfer = {
  id: string; item_name: string; quantity: number; notes: string | null; created_at: string;
  from_branch_id: string; to_branch_id: string;
};

function TransfersPage() {
  const qc = useQueryClient();
  const [sourceId, setSourceId] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data as Branch[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory-for-transfer"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventories").select("id, name, sku, quantity, branch_id").gt("quantity", 0).order("name");
      if (error) throw error;
      return data as Inv[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_transfers").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Transfer[];
    },
  });

  const branchName = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b.name])), [branches]);
  const selected = items.find((i) => i.id === sourceId);

  const transfer = useMutation({
    mutationFn: async () => {
      if (!sourceId) throw new Error("Pick an item");
      if (!toBranch) throw new Error("Pick a destination branch");
      if (selected && selected.branch_id === toBranch) throw new Error("Same branch");
      const { error } = await supabase.rpc("transfer_stock", {
        _source_inventory_id: sourceId,
        _to_branch_id: toBranch,
        _quantity: qty,
        _notes: notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock transferred");
      setSourceId(""); setToBranch(""); setQty(1); setNotes("");
      qc.invalidateQueries({ queryKey: ["inventory-for-transfer"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Stock Transfers</h1>
        <p className="text-muted-foreground text-sm">Move inventory between branches.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <form
          onSubmit={(e) => { e.preventDefault(); transfer.mutate(); }}
          className="rounded-2xl border bg-card shadow-card p-5 space-y-4"
        >
          <h3 className="font-semibold flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> New transfer</h3>
          <div>
            <Label>Item (source)</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder="Pick item" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} {i.sku ? `(${i.sku})` : ""} — {branchName[i.branch_id ?? ""] ?? "—"} · {i.quantity} avail
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>To branch</Label>
              <Select value={toBranch} onValueChange={setToBranch}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>
                  {branches.filter((b) => !selected || b.id !== selected.branch_id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} max={selected?.quantity ?? undefined} value={qty} onChange={(e) => setQty(+e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={2} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={transfer.isPending}>
            <Send className="h-4 w-4" /> {transfer.isPending ? "Transferring…" : "Transfer stock"}
          </Button>
        </form>

        <div className="rounded-2xl border bg-card shadow-card p-5">
          <h3 className="font-semibold mb-3">Recent transfers</h3>
          <div className="divide-y max-h-[480px] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No transfers yet</p>}
            {history.map((t) => (
              <div key={t.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.item_name}</span>
                  <span className="font-semibold">× {t.quantity}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {branchName[t.from_branch_id] ?? "—"} → {branchName[t.to_branch_id] ?? "—"} · {formatDateTime(t.created_at)}
                </p>
                {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
