import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({ meta: [{ title: "Branches · Stockly" }] }),
  component: BranchesPage,
});

type Branch = { id: string; name: string; address: string | null; store_id: string };

function BranchesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data as Branch[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("branches").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); toast.success("Branch deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground text-sm">{items.length} branches</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add branch</Button></DialogTrigger>
          <BranchDialog onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["branches"] }); }} />
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-10 text-center"><Building2 className="h-5 w-5 inline mr-2" />No branches yet</p>}
        {items.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center"><Building2 className="h-5 w-5 text-primary-foreground" /></div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete " + b.name + "?")) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <h3 className="mt-3 font-semibold font-display">{b.name}</h3>
            <p className="text-sm text-muted-foreground">{b.address ?? "No address"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).maybeSingle();
      if (!profile?.store_id) throw new Error("No store assigned");
      const { error } = await supabase.from("branches").insert({ name, address, store_id: profile.store_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Branch added"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add branch</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
