import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users · Stockly" }] }),
  component: UsersPage,
});

type Row = { id: string; full_name: string; email: string; created_at: string; role: "superadmin" | "ceo" | "manager" | "staff" | null };

function UsersPage() {
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })) as Row[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Row["role"] }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      if (role) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("Role updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">{rows.length} accounts</p>
      </div>
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Joined</th><th className="text-left px-4 py-3">Role</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground"><Users className="h-5 w-5 inline mr-2" />No users yet</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Select value={r.role ?? ""} onValueChange={(v) => updateRole.mutate({ userId: r.id, role: v as Row["role"] })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
