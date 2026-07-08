import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Crown,
  BadgeCheck,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Search,
  Loader2,
  ScrollText,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import logo from "@/assets/lakay-logo.png";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});

const PAGE_SIZE = 20;

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  plan: "free" | "vip";
  plan_expires_at: string | null;
  has_blue_badge: boolean;
  free_lives_balance: number;
  promotion_score: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

async function logAudit(actorId: string, action: string, targetUserId: string, details: Record<string, unknown>) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_user_id: targetUserId,
    details,
  });
  if (error) console.error("Audit log failed:", error.message);
}

function AdminPanel() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    plan: "free" | "vip";
    has_blue_badge: boolean;
    is_admin: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && user && !isAdmin) navigate({ to: "/dashboard" });
  }, [user, isAdmin, loading, navigate]);

  // --- Overview stats ---
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: totalUsers }, { count: vipUsers }, { count: badgeUsers }, { count: newUsers }] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "vip"),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("has_blue_badge", true),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sevenDaysAgo),
        ]);
      return {
        totalUsers: totalUsers ?? 0,
        vipUsers: vipUsers ?? 0,
        badgeUsers: badgeUsers ?? 0,
        newUsers: newUsers ?? 0,
      };
    },
  });

  // --- Admin role set (to flag admins in the user table) ---
  const { data: adminIds } = useQuery({
    queryKey: ["admin-role-ids"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.user_id));
    },
  });

  // --- User list ---
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    enabled: !!isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  // --- Audit log ---
  const { data: auditLogs } = useQuery({
    queryKey: ["admin-audit-logs"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const openEdit = (row: ProfileRow) => {
    setEditingUser(row);
    setEditForm({
      plan: row.plan,
      has_blue_badge: row.has_blue_badge,
      is_admin: adminIds?.has(row.user_id) ?? false,
    });
  };

  const saveEdit = async () => {
    if (!editingUser || !editForm || !user) return;
    setSavingEdit(true);
    try {
      const changes: Record<string, unknown> = {};
      if (editForm.plan !== editingUser.plan) changes.plan = editForm.plan;
      if (editForm.has_blue_badge !== editingUser.has_blue_badge) {
        changes.has_blue_badge = editForm.has_blue_badge;
        changes.badge_granted_at = editForm.has_blue_badge ? new Date().toISOString() : null;
        changes.badge_granted_by = editForm.has_blue_badge ? user.id : null;
      }

      if (Object.keys(changes).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(changes)
          .eq("user_id", editingUser.user_id);
        if (error) throw error;
        await logAudit(user.id, "profile_updated", editingUser.user_id, changes);
      }

      const wasAdmin = adminIds?.has(editingUser.user_id) ?? false;
      if (editForm.is_admin && !wasAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: editingUser.user_id, role: "admin" });
        if (error) throw error;
        await logAudit(user.id, "role_granted", editingUser.user_id, { role: "admin" });
      } else if (!editForm.is_admin && wasAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingUser.user_id)
          .eq("role", "admin");
        if (error) throw error;
        await logAudit(user.id, "role_revoked", editingUser.user_id, { role: "admin" });
      }

      toast.success("Utilisateur mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-role-ids"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setEditingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour");
    } finally {
      setSavingEdit(false);
    }
  };

  const statCards = useMemo(
    () => [
      { icon: Users, label: "Utilisateurs totaux", value: stats?.totalUsers ?? "—" },
      { icon: Crown, label: "Abonnés VIP", value: stats?.vipUsers ?? "—" },
      { icon: BadgeCheck, label: "Badges bleus", value: stats?.badgeUsers ?? "—" },
      { icon: UserPlus, label: "Nouveaux (7j)", value: stats?.newUsers ?? "—" },
    ],
    [stats],
  );

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <img src={logo} alt="Lakay Digital" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display font-bold tracking-tight">
              Panneau <span className="text-gradient">Admin</span>
            </span>
          </div>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="audit">
              <ScrollText className="mr-1.5 h-4 w-4" /> Journal d'audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {statCards.map((s) => (
                <Card key={s.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                    <s.icon className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-display">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Parrainage</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : users && users.length > 0 ? (
                    users.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.display_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.plan === "vip" ? "default" : "secondary"}>
                            {row.plan === "vip" ? "VIP" : "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.has_blue_badge ? (
                            <BadgeCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {adminIds?.has(row.user_id) ? (
                            <Badge variant="outline" className="gap-1">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Utilisateur</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.referral_code}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                            Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!users || users.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs && auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.target_user_id ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucune action enregistrée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingUser?.display_name ?? editingUser?.email}</DialogTitle>
            <DialogDescription>
              Les changements sont appliqués immédiatement et enregistrés dans le journal d'audit.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <Select
                  value={editForm.plan}
                  onValueChange={(v: "free" | "vip") => setEditForm({ ...editForm, plan: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Badge bleu</label>
                <Switch
                  checked={editForm.has_blue_badge}
                  onCheckedChange={(v) => setEditForm({ ...editForm, has_blue_badge: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  {editForm.is_admin ? (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  Rôle administrateur
                </label>
                <Switch
                  checked={editForm.is_admin}
                  disabled={editingUser?.email === "odiussayleywadson@gmail.com"}
                  onCheckedChange={(v) => setEditForm({ ...editForm, is_admin: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>
              Annuler
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
