import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Pencil, Plus, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stores")({
  component: StoresPage,
});

type StoreRow = {
  id: string;
  name: string;
  subdomain: string | null;
  currency: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  legacy_id: number | null;
  status: string | null;
  owner_email: string | null;
  country: string | null;
  business_type: string | null;
};

function StoresPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: isSuper } = useQuery({
    queryKey: ["is-super"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "superadmin").maybeSingle();
      return !!data;
    },
  });

  const { data: stores, isLoading } = useQuery({
    queryKey: ["all-stores"],
    enabled: !!isSuper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, subdomain, currency, phone, address, logo, legacy_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoreRow[];
    },
  });

  const saveStore = useMutation({
    mutationFn: async (s: Partial<StoreRow> & { id?: string }) => {
      if (s.id) {
        const { error } = await supabase.from("stores").update({
          name: s.name, subdomain: s.subdomain, currency: s.currency,
          phone: s.phone, address: s.address, logo: s.logo,
        }).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stores").insert({
          name: s.name!, subdomain: s.subdomain ?? null, currency: s.currency ?? "NGN",
          phone: s.phone ?? null, address: s.address ?? null, logo: s.logo ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-stores"] });
      setEditing(null); setCreating(false);
      toast.success("Store saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  if (isSuper === false) {
    return (
      <AppShell>
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Only superadmins can manage stores.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> All Stores</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage every tenant on the platform.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> New store</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
            {stores?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {s.logo ? <img src={s.logo} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-muted" />}
                    {s.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.subdomain ?? "—"}</TableCell>
                <TableCell>{s.currency}</TableCell>
                <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StoreDialog
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        initial={editing ?? undefined}
        onSubmit={(s) => saveStore.mutate(s)}
        saving={saveStore.isPending}
      />
    </AppShell>
  );
}

function StoreDialog({ open, onClose, initial, onSubmit, saving }: {
  open: boolean; onClose: () => void; initial?: StoreRow;
  onSubmit: (s: Partial<StoreRow> & { id?: string }) => void; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<StoreRow>>({
    name: initial?.name ?? "",
    subdomain: initial?.subdomain ?? "",
    currency: initial?.currency ?? "NGN",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    logo: initial?.logo ?? "",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit store" : "New store"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Subdomain</Label><Input value={form.subdomain ?? ""} onChange={(e) => setForm((f) => ({ ...f, subdomain: e.target.value }))} /></div>
            <div><Label>Currency</Label><Input value={form.currency ?? ""} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} /></div>
          </div>
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>Logo URL</Label><Input value={form.logo ?? ""} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ ...form, id: initial?.id })} disabled={saving || !form.name}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
