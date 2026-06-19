import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log · Stockly" }] }),
  component: AuditPage,
});

type Log = { id: string; actor_id: string | null; entity: string; entity_id: string | null; action: string; details: Record<string, unknown> | null; created_at: string };
type Profile = { id: string; full_name: string };

const ENTITIES = ["all", "sale", "return", "damage", "credit_sale", "credit_payment", "stock_receipt"] as const;

function AuditPage() {
  const [entity, setEntity] = useState<typeof ENTITIES[number]>("all");
  const [q, setQ] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: async () => {
      let qry = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (entity !== "all") qry = qry.eq("entity", entity);
      const { data, error } = await qry;
      if (error) throw error;
      return data as Log[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });
  const pMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  const filtered = logs.filter((l) => !q || JSON.stringify(l.details ?? {}).toLowerCase().includes(q.toLowerCase()) || l.action.includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Immutable trail of business events. Managers & up only.</p>
        </div>
        <div className="flex gap-2">
          <Select value={entity} onValueChange={(v) => setEntity(v as typeof ENTITIES[number])}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{ENTITIES.map((e) => <SelectItem key={e} value={e}>{e === "all" ? "All entities" : e.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="w-64" placeholder="Search details" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Who</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground"><ScrollText className="h-5 w-5 inline mr-2" />No events yet</td></tr>}
              {filtered.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</td>
                  <td className="px-4 py-3">{l.actor_id ? pMap.get(l.actor_id) ?? "—" : "System"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-muted text-xs">{l.entity}</span></td>
                  <td className="px-4 py-3">{l.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-md truncate">{l.details ? JSON.stringify(l.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
