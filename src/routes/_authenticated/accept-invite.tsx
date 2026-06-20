import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accept-invite")({
  head: () => ({ meta: [{ title: "Accept Invite · Stockly" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_invite", { _code: code.trim().toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welcome to the team!");
      qc.clear();
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="rounded-2xl border bg-card shadow-card p-6 space-y-4">
        <h1 className="font-display text-2xl font-bold">Join a store</h1>
        <p className="text-sm text-muted-foreground">Paste the invite code your owner shared with you. You must be signed in with the invited email.</p>
        <form onSubmit={(e) => { e.preventDefault(); accept.mutate(); }} className="space-y-3">
          <div><Label>Invite code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" required /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={accept.isPending}><Check className="h-4 w-4" /> {accept.isPending ? "Joining…" : "Accept invite"}</Button>
        </form>
      </div>
    </div>
  );
}
