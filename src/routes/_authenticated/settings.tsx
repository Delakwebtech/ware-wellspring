import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Stockly" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: profile }, { data: store }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("stores").select("*").limit(1).maybeSingle(),
      ]);
      return { user, profile, store };
    },
  });

  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [currency, setCurrency] = useState("NGN");

  useEffect(() => {
    if (data?.profile) setFullName(data.profile.full_name ?? "");
    if (data?.store) { setStoreName(data.store.name ?? ""); setCurrency(data.store.currency ?? "NGN"); }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data?.user) return;
      const { error: pErr } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
      if (pErr) throw pErr;
      if (data.store) {
        const { error: sErr } = await supabase.from("stores").update({ name: storeName, currency }).eq("id", data.store.id);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="font-display text-3xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Profile and store settings</p></div>

      <div className="rounded-2xl border bg-card p-6 shadow-card space-y-4">
        <h3 className="font-semibold">Profile</h3>
        <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><Label>Email</Label><Input value={data?.user.email ?? ""} disabled /></div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card space-y-4">
        <h3 className="font-semibold">Store</h3>
        <div><Label>Store name</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
        <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={4} /></div>
      </div>

      <Button variant="hero" size="lg" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
    </div>
  );
}
