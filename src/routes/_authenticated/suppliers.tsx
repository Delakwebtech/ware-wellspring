import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers · Stockly" }] }),
  component: SuppliersPage,
});

type Supplier = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; store_id: string };

function SuppliersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [q, setQ] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = items.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.contact_name ?? "").toLowerCase().includes(q.toLowerCase()) || (s.phone ?? "").includes(q));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground text-sm">{items.length} suppliers in your vendor directory</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-64" placeholder="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add supplier</Button></DialogTrigger>
            <SupplierDialog editing={editing} onClose={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["suppliers"] }); }} />
          </Dialog>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <Truck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No suppliers yet. Add your first vendor to start tracking purchases.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center"><Truck className="h-5 w-5 text-primary-foreground" /></div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete " + s.name + "?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <h3 className="mt-3 font-semibold font-display">{s.name}</h3>
              {s.contact_name && <p className="text-sm text-muted-foreground">{s.contact_name}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {s.phone && <p>📞 {s.phone}</p>}
                {s.email && <p>✉ {s.email}</p>}
                {s.address && <p>📍 {s.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierDialog({ editing, onClose }: { editing: Supplier | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? "", contact_name: editing?.contact_name ?? "", phone: editing?.phone ?? "",
    email: editing?.email ?? "", address: editing?.address ?? "", notes: editing?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).maybeSingle();
      if (!profile?.store_id) throw new Error("No store assigned");
      const payload = { ...form, store_id: profile.store_id };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Added"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Company name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Contact person</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
