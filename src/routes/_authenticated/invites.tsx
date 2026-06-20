import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invites")({
  head: () => ({ meta: [{ title: "Invite Staff · Stockly" }] }),
  component: InvitesPage,
});

const ROLES = ["ceo", "manager", "staff"] as const;
type Role = (typeof ROLES)[number];

type Invite = { id: string; email: string; role: string; code: string; status: string; expires_at: string; created_at: string; branch_id: string | null };
type Branch = { id: string; name: string };

function InvitesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ email: string; role: Role; branch_id: string }>({ email: "", role: "staff", branch_id: "" });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data as Branch[];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_invites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.email) throw new Error("Email required");
      const { data, error } = await supabase.rpc("create_invite", {
        _email: form.email, _role: form.role, _branch_id: form.branch_id || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (code) => {
      toast.success(`Invite code: ${code}`);
      navigator.clipboard?.writeText(code).catch(() => {});
      setForm({ email: "", role: "staff", branch_id: "" });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_invites").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["invites"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Invite Staff</h1>
        <p className="text-muted-foreground text-sm">Share the code — they sign up with the invited email, then redeem it at <code className="text-primary">/accept-invite</code>.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> New invite</h3>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch (optional)</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Generate invite"}</Button>
        </form>

        <div className="rounded-2xl border bg-card shadow-card p-5">
          <h3 className="font-semibold mb-3">Invitations</h3>
          <div className="divide-y max-h-[480px] overflow-y-auto">
            {invites.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No invites yet</p>}
            {invites.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.email} <span className="text-xs uppercase text-muted-foreground">· {i.role}</span></p>
                  <p className="text-xs text-muted-foreground">{i.status} · {branchMap[i.branch_id ?? ""] ?? "any branch"} · expires {formatDateTime(i.expires_at)}</p>
                  <p className="text-xs mt-1">Code: <span className="font-mono font-semibold">{i.code}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" title="Copy code" onClick={() => { navigator.clipboard?.writeText(i.code); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                  {i.status === "pending" && <Button size="icon" variant="ghost" onClick={() => { if (confirm("Revoke?")) revoke.mutate(i.id); }}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
