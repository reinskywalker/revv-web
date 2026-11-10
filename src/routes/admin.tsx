import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AtSign,
  Bell,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
  Loader2,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import {
  type AdminDashboardStats,
  type AdminUserItem,
  type BetaRegistrationRow,
  type BroadcastNotificationItem,
  createAdminBrand,
  createAdminComponent,
  createAdminMotorcycle,
  createAdminNewsArticle,
  deleteAdminBrand,
  deleteAdminComponent,
  deleteAdminMotorcycle,
  deleteAdminNewsArticle,
  deleteAdminUser,
  deleteBetaRegistration,
  fetchAdminBrands,
  fetchAdminBroadcasts,
  fetchAdminComponents,
  fetchAdminDashboard,
  fetchAdminMotorcycles,
  fetchAdminUsers,
  fetchBetaRegistrations,
  fetchNewsArticles,
  type MasterBrandItem,
  type MasterComponentItem,
  type MasterMotorcycleItem,
  type NewsArticle,
  sendAdminBroadcast,
  updateAdminBrand,
  updateAdminUser,
  updateBetaRegistration,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administrator Command Console — REVV Web" },
      {
        name: "description",
        content: "REVV Superuser Command Center for user management, master catalog, beta tester roster, and push broadcast CMS.",
      },
    ],
  }),
  component: AdminPage,
});

type AdminSubTab = "overview" | "registrations" | "users" | "master" | "news" | "broadcast";

function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Data states
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [betaRegistrations, setBetaRegistrations] = useState<BetaRegistrationRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminBrands, setAdminBrands] = useState<MasterBrandItem[]>([]);
  const [adminMotorcycles, setAdminMotorcycles] = useState<MasterMotorcycleItem[]>([]);
  const [adminComponents, setAdminComponents] = useState<MasterComponentItem[]>([]);
  const [adminNews, setAdminNews] = useState<NewsArticle[]>([]);
  const [adminBroadcasts, setAdminBroadcasts] = useState<BroadcastNotificationItem[]>([]);

  // Master creation form inputs
  const [newBrandName, setNewBrandName] = useState("");
  const [newMotoBrandId, setNewMotoBrandId] = useState("");
  const [newMotoSeries, setNewMotoSeries] = useState("");
  const [newMotoTransmission, setNewMotoTransmission] = useState("matic");
  const [newMotoCategory, setNewMotoCategory] = useState("scooter");
  const [newMotoCc, setNewMotoCc] = useState("150");
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompKm, setNewCompKm] = useState("4000");
  const [newCompMonths, setNewCompMonths] = useState("6");

  // News creation form inputs
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsCategory, setNewNewsCategory] = useState("MAINTENANCE");
  const [newNewsSummary, setNewNewsSummary] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");

  // Broadcast push form inputs
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTargetType, setBroadcastTargetType] = useState<"all" | "user">("all");
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState<string>("");
  const [broadcastDeepLink, setBroadcastDeepLink] = useState("/rides");
  const [broadcastIsSending, setBroadcastIsSending] = useState(false);

  const isSuperuser =
    user?.role?.toLowerCase() === "administrator" || user?.role?.toLowerCase() === "moderator";

  const refreshAllAdminData = async () => {
    try {
      setLoading(true);
      const [stats, users, betas, brands, motos, comps, newsRes, broadcasts] = await Promise.all([
        fetchAdminDashboard().catch(() => null),
        fetchAdminUsers().catch(() => []),
        fetchBetaRegistrations().catch(() => []),
        fetchAdminBrands().catch(() => []),
        fetchAdminMotorcycles().catch(() => []),
        fetchAdminComponents().catch(() => []),
        fetchNewsArticles({ limit: 50 }).catch(() => ({ articles: [], total: 0 })),
        fetchAdminBroadcasts().catch(() => []),
      ]);
      setAdminStats(stats);
      setAdminUsers(users);
      setBetaRegistrations(betas);
      setAdminBrands(brands);
      setAdminMotorcycles(motos);
      setAdminComponents(comps);
      setAdminNews(newsRes.articles);
      setAdminBroadcasts(broadcasts);
      if (brands.length > 0 && !newMotoBrandId) {
        setNewMotoBrandId(String(brands[0].id));
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to load administrator data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSuperuser) {
      refreshAllAdminData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isSuperuser]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in mx-auto max-w-xl space-y-6 text-center py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Restricted Command Deck
        </h1>
        <p className="text-sm text-muted-foreground">
          You must authenticate with superuser credentials to enter the REVV Administrator Console.
        </p>
        <div className="pt-2">
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Proceed to Login
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="animate-fade-in mx-auto max-w-xl space-y-6 text-center py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-destructive sm:text-4xl">
          Access Denied
        </h1>
        <p className="text-sm text-muted-foreground">
          Your current account role is <strong className="text-foreground uppercase">{user?.role || "user"}</strong>. Administrator clearance is required to view or execute commands in this console.
        </p>
        <div className="pt-2">
          {user?.username ? (
            <Link
              to="/id/$username"
              params={{ username: user.username }}
              className="btn-primary inline-flex items-center gap-2"
            >
              Return to Profile
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <Link to="/feed" className="btn-primary inline-flex items-center gap-2">
              Go to Rider Feed
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <ShieldCheck className="size-3.5" />
            <span>Superuser Command Deck</span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            Administrator Console
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Role: <span className="font-bold uppercase text-primary">{user?.role}</span> · Realtime Control for Roster, Catalog, RBAC, and Push Broadcasts.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAllAdminData}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card/60 px-4 py-2 font-mono text-xs font-semibold uppercase text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:self-center"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Sync Live Data
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-4 font-mono text-xs text-primary">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="hover:underline uppercase text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-4">
        {(
          [
            ["overview", "Overview", LayoutDashboard],
            ["registrations", `Beta Roster (${betaRegistrations.length})`, UserCheck],
            ["users", `Users & RBAC (${adminUsers.length})`, Users],
            ["master", "Master Data CRUD", Database],
            ["news", `News CMS (${adminNews.length})`, FileText],
            ["broadcast", `Push Broadcast (${adminBroadcasts.length})`, Bell],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSubTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
              activeSubTab === key
                ? "border-primary bg-primary/20 text-primary shadow-sm"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hud-card flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              {adminStats ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Active Users", adminStats.active_users],
                    ["Suspended / Deleted", `${adminStats.suspended_users} / ${adminStats.deleted_users}`],
                    ["Pending Beta Roster", adminStats.pending_registrations],
                    ["Approved Beta Roster", adminStats.approved_registrations],
                    ["Digital Garages", adminStats.total_garages],
                    ["Feed Posts", adminStats.total_feed_posts],
                    ["Master Motorcycles", adminStats.total_master_motorcycles],
                    ["Master Components", adminStats.total_master_components],
                  ].map(([title, value]) => (
                    <div key={String(title)} className="hud-card p-5">
                      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        {title}
                      </p>
                      <p className="font-display mt-2 text-3xl font-black text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hud-card p-8 text-center text-muted-foreground">
                  No dashboard statistics returned from backend.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BETA REGISTRATIONS */}
          {activeSubTab === "registrations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black uppercase tracking-tight">
                  Pre-Launch Beta Registrations Roster
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  Total: {betaRegistrations.length}
                </span>
              </div>

              {betaRegistrations.length === 0 ? (
                <div className="hud-card p-12 text-center text-muted-foreground">
                  No beta pre-registrations submitted yet.
                </div>
              ) : (
                betaRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="hud-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{reg.full_name}</span>
                        <span className="font-mono text-xs text-primary">{reg.email}</span>
                        <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-primary">
                          {reg.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        Play Store: {reg.playstore_email || reg.email} · Phone: {reg.phone || "-"} · City: {reg.city || "-"} · Bike: {reg.motorcycle_brand || "-"} {reg.motorcycle_series || ""}
                      </p>
                      {reg.notes && (
                        <p className="text-xs text-muted-foreground/90 italic">
                          "{reg.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(["approved", "invited", "rejected"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={async () => {
                            await updateBetaRegistration(reg.id, { status: st });
                            setBetaRegistrations(await fetchBetaRegistrations());
                            setNotice(`Beta registration marked as ${st}.`);
                          }}
                          className={cn(
                            "rounded border px-2.5 py-1.5 font-mono text-[11px] uppercase transition-colors",
                            reg.status === st
                              ? "border-primary bg-primary/20 text-primary font-bold"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                          )}
                        >
                          {st}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = window.confirm(`Delete registration for ${reg.full_name}?`);
                          if (!ok) return;
                          await deleteBetaRegistration(reg.id);
                          setBetaRegistrations(await fetchBetaRegistrations());
                          setNotice("Registration deleted.");
                        }}
                        className="rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                        title="Delete registration"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: USERS & RBAC */}
          {activeSubTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black uppercase tracking-tight">
                  User Management & Role-Based Access Control
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  Total: {adminUsers.length} Riders
                </span>
              </div>

              <div className="space-y-3">
                {adminUsers.map((u) => {
                  const isSelf =
                    u.id === user?.id || (user?.email && u.email?.toLowerCase() === user.email.toLowerCase());

                  return (
                    <div
                      key={u.id}
                      className="hud-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">
                            {u.username ? `@${u.username}` : u.email || u.phone || u.id}
                          </span>
                          {u.noreg && (
                            <span className="font-mono text-xs text-primary font-bold">{u.noreg}</span>
                          )}
                          <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] uppercase font-bold">
                            Role: {u.role}
                          </span>
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 font-mono text-[10px] uppercase font-bold",
                              u.status === "Active"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-destructive/20 text-destructive",
                            )}
                          >
                            {u.status}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          Email: {u.email || "-"} · Phone: {u.phone || "-"} · ID: {u.id}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isSelf ? (
                          <span className="rounded border border-primary/50 bg-primary/20 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                            You (Superuser)
                          </span>
                        ) : (
                          <>
                            <select
                              value={u.role.toLowerCase()}
                              onChange={async (e) => {
                                const nextRole = e.target.value;
                                if (nextRole === u.role.toLowerCase()) return;
                                const ok = window.confirm(
                                  `Are you sure you want to change the role of ${u.email || u.username} to ${nextRole.toUpperCase()}?`,
                                );
                                if (!ok) {
                                  e.target.value = u.role.toLowerCase();
                                  return;
                                }
                                try {
                                  await updateAdminUser(u.id, { role: nextRole });
                                  setAdminUsers(await fetchAdminUsers());
                                  setNotice(`Updated role for ${u.email || u.username} to ${nextRole}`);
                                } catch (err) {
                                  setNotice(err instanceof Error ? err.message : "Failed to update role");
                                }
                              }}
                              className="rounded border border-input bg-secondary/60 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
                            >
                              <option value="user" className="bg-background">
                                user
                              </option>
                              <option value="moderator" className="bg-background">
                                moderator
                              </option>
                              <option value="administrator" className="bg-background">
                                administrator
                              </option>
                            </select>

                            <select
                              value={u.status}
                              onChange={async (e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus === u.status) return;
                                const ok = window.confirm(
                                  `Are you sure you want to change status of ${u.email || u.username} to ${nextStatus.toUpperCase()}?`,
                                );
                                if (!ok) {
                                  e.target.value = u.status;
                                  return;
                                }
                                try {
                                  await updateAdminUser(u.id, { status: nextStatus });
                                  setAdminUsers(await fetchAdminUsers());
                                  setNotice(`Updated status for ${u.email || u.username} to ${nextStatus}`);
                                } catch (err) {
                                  setNotice(err instanceof Error ? err.message : "Failed to update status");
                                }
                              }}
                              className="rounded border border-input bg-secondary/60 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
                            >
                              <option value="Active" className="bg-background">
                                Active
                              </option>
                              <option value="Suspended" className="bg-background">
                                Suspended
                              </option>
                              <option value="Banned" className="bg-background">
                                Banned
                              </option>
                              <option value="Deleted" className="bg-background">
                                Deleted
                              </option>
                            </select>

                            <button
                              type="button"
                              onClick={async () => {
                                const ok = window.confirm(
                                  `Are you sure you want to soft-delete user ${u.email || u.username}? All active bearer sessions will be immediately invalidated.`,
                                );
                                if (!ok) return;
                                try {
                                  await deleteAdminUser(u.id);
                                  setAdminUsers(await fetchAdminUsers());
                                  setNotice("User soft-deleted and bearer sessions revoked.");
                                } catch (err) {
                                  setNotice(err instanceof Error ? err.message : "Failed to delete user");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 font-mono text-xs uppercase text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="size-3.5" />
                              Soft Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MASTER DATA CRUD */}
          {activeSubTab === "master" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Brands */}
              <div className="hud-card space-y-4 p-5">
                <h3 className="font-display text-lg font-bold uppercase">
                  Master Brands ({adminBrands.length})
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBrandName.trim()) return;
                    await createAdminBrand({ name: newBrandName.trim(), is_active: true });
                    setNewBrandName("");
                    setAdminBrands(await fetchAdminBrands());
                    setNotice("Brand added to catalog.");
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="New brand name..."
                    className="flex-1 rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded bg-primary px-3 py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                  >
                    Add
                  </button>
                </form>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {adminBrands.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                    >
                      <span>
                        {b.name}{" "}
                        {!b.is_active && (
                          <span className="text-muted-foreground">(Archived)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateAdminBrand(b.id, { is_active: !b.is_active });
                            setAdminBrands(await fetchAdminBrands());
                          }}
                          className="font-mono text-[10px] uppercase text-primary underline"
                        >
                          {b.is_active ? "Archive" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAdminBrand(b.id);
                            setAdminBrands(await fetchAdminBrands());
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motorcycles */}
              <div className="hud-card space-y-4 p-5">
                <h3 className="font-display text-lg font-bold uppercase">
                  Master Motorcycles ({adminMotorcycles.length})
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newMotoBrandId || !newMotoSeries.trim()) return;
                    await createAdminMotorcycle({
                      brand_id: Number(newMotoBrandId),
                      series_name: newMotoSeries.trim(),
                      transmission: newMotoTransmission,
                      category: newMotoCategory,
                      engine_cc: Number(newMotoCc) || 150,
                      is_active: true,
                    });
                    setNewMotoSeries("");
                    setAdminMotorcycles(await fetchAdminMotorcycles());
                    setNotice("Motorcycle added to master catalog.");
                  }}
                  className="space-y-2"
                >
                  <select
                    value={newMotoBrandId}
                    onChange={(e) => setNewMotoBrandId(e.target.value)}
                    className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {adminBrands.map((b) => (
                      <option key={b.id} value={String(b.id)} className="bg-background">
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newMotoSeries}
                    onChange={(e) => setNewMotoSeries(e.target.value)}
                    placeholder="Series name (e.g. XMAX 250)"
                    className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newMotoTransmission}
                      onChange={(e) => setNewMotoTransmission(e.target.value)}
                      className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="matic" className="bg-background">matic</option>
                      <option value="manual" className="bg-background">manual</option>
                    </select>
                    <select
                      value={newMotoCategory}
                      onChange={(e) => setNewMotoCategory(e.target.value)}
                      className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="scooter" className="bg-background">scooter</option>
                      <option value="sport" className="bg-background">sport</option>
                      <option value="naked" className="bg-background">naked</option>
                      <option value="touring" className="bg-background">touring</option>
                    </select>
                    <input
                      type="number"
                      value={newMotoCc}
                      onChange={(e) => setNewMotoCc(e.target.value)}
                      placeholder="CC"
                      className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-primary py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                  >
                    Add Motorcycle
                  </button>
                </form>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {adminMotorcycles.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                    >
                      <span>
                        {m.brand_name} {m.series_name} ({m.engine_cc || "-"}cc)
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAdminMotorcycle(m.id);
                          setAdminMotorcycles(await fetchAdminMotorcycles());
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Components */}
              <div className="hud-card space-y-4 p-5">
                <h3 className="font-display text-lg font-bold uppercase">
                  Master Components ({adminComponents.length})
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCompCode.trim() || !newCompName.trim()) return;
                    await createAdminComponent({
                      code: newCompCode.trim(),
                      name: newCompName.trim(),
                      default_interval_km: Number(newCompKm) || 4000,
                      default_interval_months: Number(newCompMonths) || 6,
                      applicable_transmission: ["matic", "manual"],
                      is_active: true,
                    });
                    setNewCompCode("");
                    setNewCompName("");
                    setAdminComponents(await fetchAdminComponents());
                    setNotice("Component added to catalog.");
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    value={newCompCode}
                    onChange={(e) => setNewCompCode(e.target.value)}
                    placeholder="Code (e.g. ENGINE_OIL)"
                    className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="Component Name"
                    className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newCompKm}
                      onChange={(e) => setNewCompKm(e.target.value)}
                      placeholder="Interval KM"
                      className="rounded border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground"
                    />
                    <input
                      type="number"
                      value={newCompMonths}
                      onChange={(e) => setNewCompMonths(e.target.value)}
                      placeholder="Interval Months"
                      className="rounded border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-primary py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                  >
                    Add Component
                  </button>
                </form>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {adminComponents.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                    >
                      <span>
                        {c.name} ({c.default_interval_km || "-"} km)
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAdminComponent(c.id);
                          setAdminComponents(await fetchAdminComponents());
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NEWS CMS */}
          {activeSubTab === "news" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newNewsTitle.trim() || !newNewsContent.trim()) return;
                  await createAdminNewsArticle({
                    title: newNewsTitle.trim(),
                    category: newNewsCategory,
                    summary: newNewsSummary.trim() || newNewsTitle.trim(),
                    content: newNewsContent.trim(),
                    is_highlight: false,
                  });
                  setNewNewsTitle("");
                  setNewNewsSummary("");
                  setNewNewsContent("");
                  const res = await fetchNewsArticles({ limit: 50 });
                  setAdminNews(res.articles);
                  setNotice("News article published to riders.");
                }}
                className="hud-card space-y-3 p-5"
              >
                <h3 className="font-display text-lg font-bold uppercase">
                  Publish News Article
                </h3>
                <input
                  type="text"
                  required
                  value={newNewsTitle}
                  onChange={(e) => setNewNewsTitle(e.target.value)}
                  placeholder="Article headline"
                  className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={newNewsCategory}
                  onChange={(e) => setNewNewsCategory(e.target.value)}
                  placeholder="Category (MAINTENANCE, SAFETY, PRODUCT)"
                  className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={newNewsSummary}
                  onChange={(e) => setNewNewsSummary(e.target.value)}
                  placeholder="Short summary"
                  className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <textarea
                  rows={5}
                  required
                  value={newNewsContent}
                  onChange={(e) => setNewNewsContent(e.target.value)}
                  placeholder="Full article body (Markdown supported)..."
                  className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <button type="submit" className="btn-primary w-full">
                  Publish Article
                </button>
              </form>

              <div className="space-y-3 lg:col-span-2">
                {adminNews.length === 0 ? (
                  <div className="hud-card p-12 text-center text-muted-foreground">
                    No articles published yet.
                  </div>
                ) : (
                  adminNews.map((art) => (
                    <div
                      key={art.id}
                      className="hud-card flex items-center justify-between gap-4 p-5"
                    >
                      <div>
                        <span className="font-mono text-[10px] uppercase text-primary font-bold">
                          {art.category} · {art.author_name}
                        </span>
                        <h4 className="font-display text-lg font-bold text-foreground">{art.title}</h4>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {art.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAdminNewsArticle(art.id);
                          const res = await fetchNewsArticles({ limit: 50 });
                          setAdminNews(res.articles);
                          setNotice("Article deleted.");
                        }}
                        className="rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                        title="Delete article"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PUSH BROADCAST CMS */}
          {activeSubTab === "broadcast" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    Push Notification Broadcast CMS
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Broadcast push notifications to all REVV mobile app riders or target specific users via Firebase Cloud Messaging & Realtime SSE.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setAdminBroadcasts(await fetchAdminBroadcasts().catch(() => []));
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh Logs
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Composer Column */}
                <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5 lg:col-span-7">
                  <h4 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground">
                    <Radio className="size-4 text-primary" />
                    Compose Push Notification
                  </h4>

                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBroadcastTargetType("all");
                          setBroadcastTargetUserId("");
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border p-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
                          broadcastTargetType === "all"
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Users className="size-4" />
                        All Active Riders
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBroadcastTargetType("user");
                          if (adminUsers.length > 0 && !broadcastTargetUserId) {
                            setBroadcastTargetUserId(adminUsers[0].id);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border p-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
                          broadcastTargetType === "user"
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <AtSign className="size-4" />
                        Targeted Rider
                      </button>
                    </div>
                  </div>

                  {broadcastTargetType === "user" && (
                    <div className="space-y-2">
                      <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Target Rider
                      </label>
                      <select
                        value={broadcastTargetUserId}
                        onChange={(e) => setBroadcastTargetUserId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-sans text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="">-- Choose Rider --</option>
                        {adminUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            @{u.username} — {u.first_name} {u.last_name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Touring Akbar REVV 2026"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      maxLength={100}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Message Body
                    </label>
                    <textarea
                      placeholder="Tulis pesan notifikasi lengkap yang akan muncul di notification drawer mobile..."
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                    />
                    <p className="text-right font-mono text-[10px] text-muted-foreground">
                      {broadcastBody.length} / 500
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      In-App Deep Link / Route (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /rides, /news, /garage"
                      value={broadcastDeepLink}
                      onChange={(e) => setBroadcastDeepLink(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={broadcastIsSending || !broadcastTitle.trim() || !broadcastBody.trim()}
                    onClick={async () => {
                      if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
                      if (broadcastTargetType === "user" && !broadcastTargetUserId) {
                        setNotice("Please choose a target rider.");
                        return;
                      }
                      setBroadcastIsSending(true);
                      setNotice(null);
                      try {
                        const res = await sendAdminBroadcast({
                          title: broadcastTitle.trim(),
                          body: broadcastBody.trim(),
                          target_type: broadcastTargetType,
                          target_user_id: broadcastTargetType === "user" ? broadcastTargetUserId : undefined,
                          data: { link: broadcastDeepLink.trim(), type: "admin_broadcast" },
                        });
                        setNotice(
                          `Push notification dispatched successfully (${res.sent_count} device targets).`,
                        );
                        setBroadcastTitle("");
                        setBroadcastBody("");
                        setAdminBroadcasts(await fetchAdminBroadcasts().catch(() => []));
                      } catch (err) {
                        setNotice(
                          err instanceof Error ? err.message : "Failed to dispatch notification",
                        );
                      } finally {
                        setBroadcastIsSending(false);
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {broadcastIsSending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Dispatching Push Broadcast...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Dispatch Push Notification
                      </>
                    )}
                  </button>
                </div>

                {/* Live Preview Column */}
                <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5 lg:col-span-5">
                  <h4 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground">
                    <Bell className="size-4 text-primary" />
                    Live Device Push Preview
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Real-time rendering of how riders will experience this alert in the mobile notification drawer:
                  </p>

                  <div className="mx-auto max-w-sm rounded-2xl border border-border/80 bg-[#0B0F14] p-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="size-3 text-muted-foreground" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          REVV Mobile Push · now
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">12:30</span>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm">
                        R
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">REVV Motorsport</span>
                          <span className="font-mono text-[9px] text-primary uppercase">
                            {broadcastTargetType === "all" ? "BROADCAST" : "TARGETED"}
                          </span>
                        </div>
                        <h5 className="mt-0.5 font-bold text-xs text-white line-clamp-1">
                          {broadcastTitle.trim() || "Notification Title Here"}
                        </h5>
                        <p className="mt-0.5 text-[11px] leading-tight text-white/70 line-clamp-2">
                          {broadcastBody.trim() ||
                            "Message content will appear here as received on Android or iOS push notification tray."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast History Table */}
              <div className="space-y-3 pt-4">
                <h4 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
                  Recent Broadcast Log ({adminBroadcasts.length})
                </h4>

                {adminBroadcasts.length === 0 ? (
                  <div className="hud-card p-8 text-center text-xs text-muted-foreground">
                    No push notifications sent yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adminBroadcasts.map((b) => (
                      <div
                        key={b.id}
                        className="hud-card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                              {b.target_type}
                            </span>
                            <h5 className="font-bold text-sm text-foreground">{b.title}</h5>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{b.body}</p>
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground text-right">
                          <span>Targets: {b.sent_count} devices</span>
                          <br />
                          <span>{new Date(b.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
