import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Stockly" }] }),
  component: SettingsPage,
});

const CURRENCIES = [
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "GHS", label: "Ghanaian Cedi (₵)" },
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
];

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

  const [profile, setProfile] = useState({ full_name: "" });
  const [store, setStore] = useState({
    name: "", currency: "NGN", phone: "", address: "", tax_percent: 0, receipt_footer: "", logo_url: "",
  });

  useEffect(() => {
    if (data?.profile) setProfile({ full_name: data.profile.full_name ?? "" });
    if (data?.store) setStore({
      name: data.store.name ?? "",
      currency: data.store.currency ?? "NGN",
      phone: data.store.phone ?? "",
      address: data.store.address ?? "",
      tax_percent: Number(data.store.tax_percent ?? 0),
      receipt_footer: data.store.receipt_footer ?? "",
      logo_url: data.store.logo_url ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data?.user) return;
      const { error: pErr } = await supabase.from("profiles").update({ full_name: profile.full_name }).eq("id", data.user.id);
      if (pErr) throw pErr;
      if (data.store) {
        const { error: sErr } = await supabase.from("stores").update(store).eq("id", data.store.id);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile and store configuration</p>
      </div>

      <section className="rounded-2xl border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold font-display text-lg">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Full name</Label><Input value={profile.full_name} onChange={(e) => setProfile({ full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={data?.user.email ?? ""} disabled /></div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold font-display text-lg">Store</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Store name</Label><Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} /></div>
          <div>
            <Label>Currency</Label>
            <Select value={store.currency} onValueChange={(v) => setStore({ ...store, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Phone</Label><Input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} /></div>
          <div><Label>Tax / VAT %</Label><Input type="number" step="0.01" min="0" value={store.tax_percent} onChange={(e) => setStore({ ...store, tax_percent: +e.target.value })} /></div>
        </div>
        <div><Label>Address</Label><Input value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} /></div>
        <div><Label>Logo URL</Label><Input value={store.logo_url} onChange={(e) => setStore({ ...store, logo_url: e.target.value })} placeholder="https://…" /></div>
        <div><Label>Receipt footer</Label><Textarea rows={3} value={store.receipt_footer} onChange={(e) => setStore({ ...store, receipt_footer: e.target.value })} placeholder="Thank you for shopping with us!" /></div>
      </section>

      <Button variant="hero" size="lg" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
    </div>
  );
}
