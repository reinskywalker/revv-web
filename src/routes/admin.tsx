import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  AtSign,
  Bell,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Database,
  FilePlus2,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Megaphone,
  MessageSquare,
  Pencil,
  Power,
  Radio,
  RefreshCw,
  Scale,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { RichTextEditor } from "@/components/revv/RichTextEditor";
import {
  type AdminDashboardStats,
  type AdminSystemStatusRecord,
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
  fetchAdminLegalDocuments,
  fetchAdminMotorcycles,
  fetchAdminNewsArticles,
  fetchAdminSupportTickets,
  fetchAdminSystemStatus,
  fetchAdminUsers,
  fetchBetaRegistrations,
  type LegalDocumentItem,
  type MasterBrandItem,
  type MasterComponentItem,
  type MasterMotorcycleItem,
  type NewsArticle,
  replyAdminSupportTicket,
  resolveMediaUrl,
  sendAdminBroadcast,
  type SupportTicketItem,
  updateAdminBrand,
  updateAdminNewsArticle,
  updateAdminSystemStatus,
  updateAdminUser,
  updateBetaRegistration,
  uploadCompressedMedia,
  upsertAdminLegalDocument,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administrator Command Console — REVV Web" },
      {
        name: "description",
        content:
          "REVV Superuser Command Center for user management, master catalog, beta tester roster, and push broadcast CMS.",
      },
    ],
  }),
  component: AdminPage,
});

type AdminSubTab =
  | "overview"
  | "registrations"
  | "users"
  | "master"
  | "news"
  | "broadcast"
  | "support"
  | "legal"
  | "maintenance";

type AdminConfirmAction =
  | { kind: "delete_beta"; reg: BetaRegistrationRow }
  | { kind: "change_role"; user: AdminUserItem; nextRole: string }
  | { kind: "change_status"; user: AdminUserItem; nextStatus: string }
  | { kind: "soft_delete_user"; user: AdminUserItem };

const NEWS_CATEGORIES = ["EDITORIAL", "UPDATE", "SAFETY", "COMMUNITY", "TELEMETRY", "EVENT"];

function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<AdminConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Data states
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [betaRegistrations, setBetaRegistrations] = useState<BetaRegistrationRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminBrands, setAdminBrands] = useState<MasterBrandItem[]>([]);
  const [adminMotorcycles, setAdminMotorcycles] = useState<MasterMotorcycleItem[]>([]);
  const [adminComponents, setAdminComponents] = useState<MasterComponentItem[]>([]);
  const [adminNews, setAdminNews] = useState<NewsArticle[]>([]);
  const [adminBroadcasts, setAdminBroadcasts] = useState<BroadcastNotificationItem[]>([]);

  // Maintenance & System Health state
  const [systemStatus, setSystemStatus] = useState<AdminSystemStatusRecord | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [statusTitle, setStatusTitle] = useState("Under Scheduled Maintenance");
  const [statusMessage, setStatusMessage] = useState(
    "We are performing scheduled maintenance and performance upgrades on REVV servers. Please wait a few moments.",
  );
  const [statusIcon, setStatusIcon] = useState("wrench");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

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

  // Broadcast push form inputs
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTargetType, setBroadcastTargetType] = useState<"all" | "user">("all");
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState<string>("");
  const [broadcastDeepLink, setBroadcastDeepLink] = useState("notifications");
  const [broadcastIsSending, setBroadcastIsSending] = useState(false);

  const isSuperuser = user?.role?.toLowerCase() === "administrator";

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    setConfirmBusy(true);
    try {
      if (pendingConfirm.kind === "delete_beta") {
        await deleteBetaRegistration(pendingConfirm.reg.id);
        setBetaRegistrations(await fetchBetaRegistrations());
        setNotice("Registration deleted.");
      } else if (pendingConfirm.kind === "change_role") {
        await updateAdminUser(pendingConfirm.user.id, { role: pendingConfirm.nextRole });
        setAdminUsers(await fetchAdminUsers());
        setNotice(
          `Updated role for ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextRole}`,
        );
      } else if (pendingConfirm.kind === "change_status") {
        await updateAdminUser(pendingConfirm.user.id, { status: pendingConfirm.nextStatus });
        setAdminUsers(await fetchAdminUsers());
        setNotice(
          `Updated status for ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextStatus}`,
        );
      } else if (pendingConfirm.kind === "soft_delete_user") {
        await deleteAdminUser(pendingConfirm.user.id);
        setAdminUsers(await fetchAdminUsers());
        setNotice("User soft-deleted and bearer sessions revoked.");
      }
      setPendingConfirm(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirmBusy(false);
    }
  };

  const refreshAllAdminData = async () => {
    try {
      setLoading(true);
      const [stats, users, betas, brands, motos, comps, newsRes, broadcasts, sysStatus] =
        await Promise.all([
          fetchAdminDashboard().catch(() => null),
          fetchAdminUsers().catch(() => []),
          fetchBetaRegistrations().catch(() => []),
          fetchAdminBrands().catch(() => []),
          fetchAdminMotorcycles().catch(() => []),
          fetchAdminComponents().catch(() => []),
          fetchAdminNewsArticles().catch(() => []),
          fetchAdminBroadcasts().catch(() => []),
          fetchAdminSystemStatus().catch(() => null),
        ]);
      setAdminStats(stats);
      setAdminUsers(users);
      setBetaRegistrations(betas);
      setAdminBrands(brands);
      setAdminMotorcycles(motos);
      setAdminComponents(comps);
      setAdminNews(newsRes);
      setAdminBroadcasts(broadcasts);
      if (sysStatus) {
        setSystemStatus(sysStatus);
        setIsMaintenance(sysStatus.is_maintenance);
        setStatusTitle(sysStatus.title);
        setStatusMessage(sysStatus.message);
        setStatusIcon(sysStatus.icon);
      }
      if (brands.length > 0 && brands[0] && !newMotoBrandId) {
        setNewMotoBrandId(String(brands[0].id));
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to load administrator data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystemStatus = async (overrideMaintenance?: boolean) => {
    setIsSavingStatus(true);
    const nextMaintenance =
      typeof overrideMaintenance === "boolean" ? overrideMaintenance : isMaintenance;
    try {
      const updated = await updateAdminSystemStatus({
        is_maintenance: nextMaintenance,
        title: statusTitle.trim(),
        message: statusMessage.trim(),
        icon: statusIcon.trim(),
      });
      setSystemStatus(updated);
      setIsMaintenance(updated.is_maintenance);
      setStatusTitle(updated.title);
      setStatusMessage(updated.message);
      setStatusIcon(updated.icon);
      setNotice(
        updated.is_maintenance
          ? "System status updated: MAINTENANCE MODE ACTIVE. Non-administrators are blocked from signing in."
          : "System status updated: OPERATIONAL.",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update system maintenance status.");
    } finally {
      setIsSavingStatus(false);
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
          Your current account role is{" "}
          <strong className="text-foreground uppercase">{user?.role || "user"}</strong>.
          Administrator clearance is required to view or execute commands in this console.
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
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
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
            Role: <span className="font-bold uppercase text-primary">{user?.role}</span> · Realtime
            Control for Roster, Catalog, RBAC, and Push Broadcasts.
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
            ["support", "Support Inbox", MessageSquare],
            ["legal", "Privacy & Legal", Scale],
            [
              "maintenance",
              isMaintenance ? "Maintenance (ACTIVE)" : "System Health",
              isMaintenance ? AlertTriangle : Wrench,
            ],
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
                    [
                      "Suspended / Deleted",
                      `${adminStats.suspended_users} / ${adminStats.deleted_users}`,
                    ],
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
                        Play Store: {reg.playstore_email || reg.email} · Phone: {reg.phone || "-"} ·
                        City: {reg.city || "-"} · Bike: {reg.motorcycle_brand || "-"}{" "}
                        {reg.motorcycle_series || ""}
                      </p>
                      {reg.notes && (
                        <p className="text-xs text-muted-foreground/90 italic">"{reg.notes}"</p>
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
                        onClick={() => setPendingConfirm({ kind: "delete_beta", reg })}
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
                    u.id === user?.id ||
                    (user?.email && u.email?.toLowerCase() === user.email.toLowerCase());

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
                            <span className="font-mono text-xs text-primary font-bold">
                              {u.noreg}
                            </span>
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
                              onChange={(e) => {
                                const nextRole = e.target.value;
                                if (nextRole === u.role.toLowerCase()) return;
                                e.target.value = u.role.toLowerCase();
                                setPendingConfirm({ kind: "change_role", user: u, nextRole });
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
                              onChange={(e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus === u.status) return;
                                e.target.value = u.status;
                                setPendingConfirm({ kind: "change_status", user: u, nextStatus });
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
                              onClick={() =>
                                setPendingConfirm({ kind: "soft_delete_user", user: u })
                              }
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
                        {!b.is_active && <span className="text-muted-foreground">(Archived)</span>}
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
                      <option value="matic" className="bg-background">
                        matic
                      </option>
                      <option value="manual" className="bg-background">
                        manual
                      </option>
                    </select>
                    <select
                      value={newMotoCategory}
                      onChange={(e) => setNewMotoCategory(e.target.value)}
                      className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="scooter" className="bg-background">
                        scooter
                      </option>
                      <option value="sport" className="bg-background">
                        sport
                      </option>
                      <option value="naked" className="bg-background">
                        naked
                      </option>
                      <option value="touring" className="bg-background">
                        touring
                      </option>
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

          {/* TAB 5: NEWS CMS (WYSIWYG + COMPRESSED MEDIA + PUSH) */}
          {activeSubTab === "news" && (
            <NewsCmsTab
              articles={adminNews}
              onReload={async () => {
                setAdminNews(await fetchAdminNewsArticles().catch(() => []));
              }}
              onNotice={setNotice}
            />
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
                    Broadcast push notifications to all REVV mobile app riders or target specific
                    users via Firebase Cloud Messaging & Realtime SSE.
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
                          if (adminUsers.length > 0 && adminUsers[0] && !broadcastTargetUserId) {
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
                      placeholder="Write the full notification message that will appear in the mobile notification drawer..."
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
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>In-App Deep Link / Target Route</span>
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                        Predefined Only
                      </span>
                    </label>
                    <select
                      value={broadcastDeepLink}
                      onChange={(e) => setBroadcastDeepLink(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <optgroup label="Core Navigation Screens">
                        <option value="notifications">
                          🔔 Notifications Screen (Default Inbox)
                        </option>
                        <option value="feed">📰 Rider Community Feed</option>
                        <option value="community">👥 Motorcycle Clubs & Community</option>
                        <option value="garage">🔧 Digital Garage & Telemetry Fleet</option>
                        <option value="chat">💬 Direct Chat & Group Comms</option>
                      </optgroup>

                      {adminNews.length > 0 && (
                        <optgroup label="Motorcycle News Articles">
                          {adminNews.map((article) => (
                            <option key={article.slug} value={`news/${article.slug}`}>
                              📖 News:{" "}
                              {article.title.length > 55
                                ? `${article.title.slice(0, 52)}...`
                                : article.title}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {adminUsers.length > 0 && (
                        <optgroup label="Rider Public Profiles">
                          {adminUsers
                            .filter((u) => u.username)
                            .slice(0, 40)
                            .map((u) => (
                              <option key={u.id} value={`profile/${u.username}`}>
                                👤 Profile: @{u.username} ({u.first_name || u.username})
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    <p className="font-mono text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                      <span>Selected Route Target:</span>
                      <code className="text-primary font-bold">
                        {broadcastDeepLink || "notifications"}
                      </code>
                    </p>
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
                        const routeTarget = broadcastDeepLink.trim() || "notifications";
                        const res = await sendAdminBroadcast({
                          title: broadcastTitle.trim(),
                          body: broadcastBody.trim(),
                          target_type: broadcastTargetType,
                          target_user_id:
                            broadcastTargetType === "user" ? broadcastTargetUserId : undefined,
                          data: {
                            route: routeTarget,
                            link: routeTarget,
                            type: "admin_broadcast",
                          },
                        });
                        setNotice(
                          `Push notification dispatched successfully (${res.sent_count} device targets).`,
                        );
                        setBroadcastTitle("");
                        setBroadcastBody("");
                        setBroadcastDeepLink("notifications");
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
                    Real-time rendering of how riders will experience this alert in the mobile
                    notification drawer:
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

          {/* SUPPORT TICKETS INBOX */}
          {activeSubTab === "support" && <SupportInboxTab onNotice={setNotice} />}

          {/* PRIVACY & GLOBAL COMPLIANCE CMS */}
          {activeSubTab === "legal" && <LegalCmsTab onNotice={setNotice} />}

          {/* TAB 7: SYSTEM HEALTH & MAINTENANCE CONTROL */}
          {activeSubTab === "maintenance" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Configuration Form Card */}
                <div className="hud-card space-y-5 p-6">
                  <div>
                    <h4 className="font-display text-lg font-black uppercase tracking-tight text-foreground">
                      Maintenance Screen Configuration
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Customize the dynamic title, description, and icon broadcast to mobile and web
                      clients.
                    </p>
                  </div>

                  {/* Mode Toggle Checkbox */}
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-4">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground block">
                        Enable Maintenance Mode
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Toggle to immediately gate user access across Android, iOS, and Web.
                      </span>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={isMaintenance}
                        onChange={(e) => setIsMaintenance(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-secondary peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>

                  {/* Title Field */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Screen Title
                    </label>
                    <input
                      type="text"
                      value={statusTitle}
                      onChange={(e) => setStatusTitle(e.target.value)}
                      placeholder="Under Scheduled Maintenance"
                      className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 font-sans text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Message Field */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Announcement / User Message
                    </label>
                    <textarea
                      rows={4}
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="We are currently performing server upgrades and maintenance. Please check back shortly..."
                      className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 font-sans text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Visual Icon Theme
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["wrench", "Wrench / Tuning", Wrench],
                          ["shield-alert", "Shield Alert", ShieldAlert],
                          ["cloud-off", "Cloud Offline", CloudOff],
                          ["server", "Server Cluster", Server],
                          ["alert-triangle", "Warning / Caution", AlertTriangle],
                        ] as const
                      ).map(([val, label, IconComponent]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setStatusIcon(val)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-mono transition-all",
                            statusIcon === val
                              ? "border-primary bg-primary/20 text-primary font-bold shadow-sm"
                              : "border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                          )}
                        >
                          <IconComponent className="size-4 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save / Disable Button */}
                  <div className="pt-2">
                    {systemStatus?.is_maintenance ? (
                      <button
                        type="button"
                        disabled={isSavingStatus}
                        onClick={() => void handleSaveSystemStatus(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60"
                      >
                        {isSavingStatus ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        <span>
                          {isSavingStatus ? "Updating Status…" : "Disable Maintenance Screen"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSavingStatus}
                        onClick={() => void handleSaveSystemStatus()}
                        className="btn-primary flex w-full items-center justify-center gap-2 py-3"
                      >
                        {isSavingStatus ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        <span>{isSavingStatus ? "Updating Status…" : "Apply System Status"}</span>
                      </button>
                    )}
                  </div>

                  {/* Metadata info */}
                  {systemStatus?.updated_at && (
                    <p className="font-mono text-[10px] text-muted-foreground text-center">
                      Last updated: {new Date(systemStatus.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Live Client Preview Card */}
                <div className="hud-card flex flex-col justify-between space-y-4 p-6">
                  <div>
                    <h4 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground">
                      <Smartphone className="size-4 text-primary" />
                      Live Mobile & Web Client Preview
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Real-time simulation of how riders experience the health checker block on
                      opening the app:
                    </p>
                  </div>

                  {/* Simulated Mobile Screen */}
                  <div className="mx-auto w-full max-w-xs rounded-[28px] border-2 border-border/80 bg-[#0B0F14] p-5 shadow-2xl space-y-6 text-center my-auto">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                      <span>09:41</span>
                      <div className="flex items-center gap-1">
                        <span>5G</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="pt-2">
                      <span className="font-display font-black tracking-widest text-lg text-primary">
                        REVV
                      </span>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                        Digital Cockpit
                      </p>
                    </div>

                    {/* Dynamic Icon */}
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-inner">
                      {statusIcon === "shield-alert" ? (
                        <ShieldAlert className="size-8" />
                      ) : statusIcon === "cloud-off" ? (
                        <CloudOff className="size-8" />
                      ) : statusIcon === "server" ? (
                        <Server className="size-8" />
                      ) : statusIcon === "alert-triangle" ? (
                        <AlertTriangle className="size-8" />
                      ) : (
                        <Wrench className="size-8" />
                      )}
                    </div>

                    {/* Title & Message */}
                    <div className="space-y-2 px-2">
                      <h5 className="font-display text-sm font-black uppercase tracking-tight text-white">
                        {statusTitle.trim() || "Under Scheduled Maintenance"}
                      </h5>
                      <p className="text-[11px] leading-relaxed text-white/70 line-clamp-4">
                        {statusMessage.trim() ||
                          "We are performing scheduled maintenance and performance upgrades on REVV servers."}
                      </p>
                    </div>

                    {/* Simulated Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="rounded-xl bg-primary/20 border border-primary/50 py-2.5 text-center text-xs font-bold text-primary font-mono uppercase">
                        Refresh Status
                      </div>
                      <div className="rounded-xl border border-border/40 py-2 text-center text-[10px] text-muted-foreground font-mono">
                        Administrator Access
                      </div>
                    </div>
                  </div>

                  <p className="text-center font-mono text-[10px] text-muted-foreground">
                    Status endpoint: <code className="text-primary font-bold">GET /health</code> &{" "}
                    <code className="text-primary font-bold">GET /api/v1/health</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={
          pendingConfirm?.kind === "delete_beta"
            ? "Delete Beta Registration"
            : pendingConfirm?.kind === "change_role"
              ? "Change User Role"
              : pendingConfirm?.kind === "change_status"
                ? "Change Account Status"
                : "Soft-Delete User"
        }
        message={
          pendingConfirm?.kind === "delete_beta"
            ? `Delete registration for ${pendingConfirm.reg.full_name}?`
            : pendingConfirm?.kind === "change_role"
              ? `Change role of ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextRole.toUpperCase()}?`
              : pendingConfirm?.kind === "change_status"
                ? `Change status of ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextStatus.toUpperCase()}?`
                : pendingConfirm?.kind === "soft_delete_user"
                  ? `Soft-delete ${pendingConfirm.user.email || pendingConfirm.user.username}? All active bearer sessions will be immediately invalidated.`
                  : ""
        }
        confirmLabel={
          pendingConfirm?.kind === "delete_beta"
            ? "Delete"
            : pendingConfirm?.kind === "soft_delete_user"
              ? "Soft Delete"
              : "Confirm"
        }
        destructive={
          pendingConfirm?.kind === "delete_beta" || pendingConfirm?.kind === "soft_delete_user"
        }
        busy={confirmBusy}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}

function NewsCmsTab({
  articles,
  onReload,
  onNotice,
}: {
  articles: NewsArticle[];
  onReload: () => Promise<void>;
  onNotice: (msg: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsArticle | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("EDITORIAL");
  const [authorName, setAuthorName] = useState("REVV Editorial");
  const [readingMinutes, setReadingMinutes] = useState(4);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isHighlight, setIsHighlight] = useState(false);
  const [highImportance, setHighImportance] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("EDITORIAL");
    setAuthorName("REVV Editorial");
    setReadingMinutes(4);
    setSummary("");
    setContent("");
    setCoverUrl("");
    setThumbnailUrl("");
    setIsHighlight(false);
    setHighImportance(false);
  };

  const selectForEdit = (article: NewsArticle) => {
    setEditingId(article.id);
    setTitle(article.title);
    setCategory(article.category || "EDITORIAL");
    setAuthorName(article.author_name || "REVV Editorial");
    setReadingMinutes(article.reading_time_minutes || 3);
    setSummary(article.summary);
    setContent(article.content);
    setCoverUrl(article.cover_image_url || "");
    setThumbnailUrl(article.thumbnail_url || article.cover_image_url || "");
    setIsHighlight(Boolean(article.is_highlight));
    setHighImportance(Boolean(article.high_importance));
    onNotice(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    onNotice(null);
    try {
      const uploaded = await uploadCompressedMedia(file);
      setCoverUrl(uploaded.url);
      setThumbnailUrl(uploaded.thumbnail_url);
      onNotice("Cover & 480px compressed thumbnail uploaded.");
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    onNotice(null);
    try {
      if (editingId) {
        const res = await updateAdminNewsArticle(editingId, {
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          content: content.trim(),
          category: category.trim() || "EDITORIAL",
          author_name: authorName.trim() || "REVV Editorial",
          cover_image_url: coverUrl || null,
          thumbnail_url: thumbnailUrl || coverUrl || null,
          reading_time_minutes: readingMinutes,
          is_highlight: isHighlight,
          high_importance: highImportance,
        });
        onNotice(
          res.push_sent_count
            ? `Article updated & high-importance push delivered to ${res.push_sent_count} devices.`
            : "News article updated.",
        );
      } else {
        const res = await createAdminNewsArticle({
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          content: content.trim(),
          category: category.trim() || "EDITORIAL",
          author_name: authorName.trim() || "REVV Editorial",
          cover_image_url: coverUrl || null,
          thumbnail_url: thumbnailUrl || coverUrl || null,
          reading_time_minutes: readingMinutes,
          is_highlight: isHighlight,
          high_importance: highImportance,
        });
        onNotice(
          res.push_sent_count
            ? `Article published! High-importance push delivered to ${res.push_sent_count} devices.`
            : "News article published to Newsroom & Mobile.",
        );
        resetForm();
      }
      await onReload();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="hud-card flex flex-col p-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground">
            Published ({articles.length})
          </h3>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase text-primary-foreground"
          >
            <FilePlus2 className="size-3.5" />
            New
          </button>
        </div>

        <div className="mt-4 max-h-[680px] space-y-2.5 overflow-y-auto pr-1">
          {articles.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No articles published yet.
            </p>
          ) : (
            articles.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  editingId === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-secondary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.high_importance && (
                      <span
                        title="High Importance Push Sent"
                        className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary"
                      >
                        PUSH
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => selectForEdit(item)}
                      className="rounded p-1 text-muted-foreground hover:text-primary"
                      aria-label="Edit article"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete article"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-bold text-foreground">
                  {item.title}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="hud-card space-y-5 p-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <h3 className="font-display text-xl font-black uppercase tracking-tight text-foreground">
            {editingId ? "Edit News Dispatch" : "Compose News Dispatch"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-mono text-xs uppercase text-muted-foreground hover:text-primary"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Headline Title *
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. REVV 2.4 Telemetry & Low-Latency Intercom"
              className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Category
            </label>
            <select
              value={NEWS_CATEGORIES.includes(category) ? category : "CUSTOM"}
              onChange={(e) => setCategory(e.target.value === "CUSTOM" ? "" : e.target.value)}
              className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="CUSTOM">Custom Category…</option>
            </select>
            {!NEWS_CATEGORIES.includes(category) && (
              <input
                type="text"
                placeholder="Enter custom category"
                value={category}
                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
                Author
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
                Read Mins
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={readingMinutes}
                onChange={(e) => setReadingMinutes(Number(e.target.value) || 3)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-foreground">
                Cover Image &amp; Auto-Compressed Thumbnail
              </p>
              <p className="text-xs text-muted-foreground">
                Canvas-compressed (1280px WebP/JPEG cover + 480px card thumbnail for mobile RAM).
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary">
              {uploadingCover ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <ImagePlus className="size-4 text-primary" />
              )}
              Upload Cover
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </label>
          </div>
          {coverUrl && (
            <div className="mt-3 flex items-center gap-4">
              <img
                src={resolveMediaUrl(thumbnailUrl || coverUrl) ?? undefined}
                alt="Cover preview"
                className="h-16 w-28 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setCoverUrl("");
                  setThumbnailUrl("");
                }}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Remove Cover
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
            Summary *
          </label>
          <textarea
            required
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Concise summary displayed on Feed carousel and Newsroom cards…"
            className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
            Article Body (WYSIWYG — Bold, Italic, Underline, Quote &amp; Captioned Images) *
          </label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Compose rich article body. Click Embed Image to upload compressed photos with 'Image : caption'…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3.5">
            <span className="text-sm font-semibold text-foreground">Feature as Highlight</span>
            <input
              type="checkbox"
              checked={isHighlight}
              onChange={(e) => setIsHighlight(e.target.checked)}
              className="size-5 accent-primary"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 shrink-0 text-primary" />
              <div>
                <span className="block text-sm font-bold text-foreground">
                  High Importance Push
                </span>
                <span className="block text-xs text-muted-foreground">
                  Send mobile push notification to active riders
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highImportance}
              onChange={(e) => setHighImportance(e.target.checked)}
              className="size-5 accent-primary"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {editingId ? "Update Dispatch" : "Publish Dispatch"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete News Article"
        message={`Delete "${deleteTarget?.title ?? "this article"}" permanently?`}
        confirmLabel="Delete Article"
        destructive
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteBusy(true);
          try {
            await deleteAdminNewsArticle(deleteTarget.id);
            if (editingId === deleteTarget.id) resetForm();
            setDeleteTarget(null);
            await onReload();
            onNotice("Article deleted.");
          } catch (err) {
            onNotice(err instanceof Error ? err.message : "Failed to delete article");
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </div>
  );
}

function SupportInboxTab({ onNotice }: { onNotice: (msg: string | null) => void }) {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminSupportTickets({ page, limit: 15, status: statusFilter });
      setTickets(res.tickets);
      setTotalPages(res.totalPages);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, onNotice]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleReply = async (ticketId: string) => {
    const reply = (replyDrafts[ticketId] || "").trim();
    if (!reply) return;
    setSendingId(ticketId);
    onNotice(null);
    try {
      const res = await replyAdminSupportTicket(ticketId, reply, "Replied");
      onNotice(
        `Reply saved for ${res.ticket.reference_code}. Push delivered to ${res.push_sent_count} device(s).`,
      );
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      await loadTickets();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="hud-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "Open", "Replied", "Closed"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold uppercase transition-colors",
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/40 text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void loadTickets()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="hud-card flex items-center justify-center gap-2 py-12">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading support tickets…</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="hud-card py-12 text-center text-sm text-muted-foreground">
          No support tickets in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="hud-card space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                    {t.reference_code}
                  </span>
                  <span className="rounded bg-secondary px-2.5 py-1 font-mono text-xs font-semibold uppercase text-foreground">
                    {t.status}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>

              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <span>
                  Rider: <strong className="text-foreground">{t.reporter_name}</strong>
                </span>
                <span>
                  Email: <strong className="text-foreground">{t.reporter_email || "—"}</strong>
                </span>
                <span>
                  Phone: <strong className="text-foreground">{t.reporter_phone || "—"}</strong>
                </span>
              </div>

              {t.device_info && Object.keys(t.device_info).length > 0 && (
                <div className="rounded-lg border border-border/60 bg-secondary/20 px-3.5 py-2.5 text-xs">
                  <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                    Device Diagnostics
                  </span>
                  <div className="grid gap-1.5 text-muted-foreground sm:grid-cols-4">
                    <span>
                      Brand:{" "}
                      <strong className="text-foreground">
                        {String(t.device_info["brand"] || t.device_info["manufacturer"] || "—")}
                      </strong>
                    </span>
                    <span>
                      Series:{" "}
                      <strong className="text-foreground">
                        {String(t.device_info["series"] || t.device_info["model"] || "—")}
                      </strong>
                    </span>
                    <span>
                      OS:{" "}
                      <strong className="text-foreground">
                        {String(t.device_info["osVersion"] || t.device_info["osName"] || "—")}
                      </strong>
                    </span>
                    <span>
                      App:{" "}
                      <strong className="text-foreground">
                        v{String(t.device_info["appVersion"] || "0.1.0")} (Build{" "}
                        {String(t.device_info["buildNumber"] || "1")})
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {t.messages && t.messages.length > 0 ? (
                <div className="space-y-2.5">
                  {t.messages.map((m) => {
                    const isAdmin = m.sender_role.toLowerCase() === "admin";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-lg border p-3.5 text-sm leading-relaxed text-foreground",
                          isAdmin
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-border/60 bg-secondary/30",
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "font-mono text-[11px] font-bold uppercase",
                              isAdmin ? "text-emerald-400" : "text-primary",
                            )}
                          >
                            {isAdmin
                              ? m.sender_name || "Support Team (Admin)"
                              : m.sender_name || t.reporter_name}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <p className="rounded-lg border border-border/60 bg-secondary/30 p-3.5 text-sm leading-relaxed text-foreground">
                    {t.message}
                  </p>

                  {t.admin_reply && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-foreground">
                      <span className="block font-mono text-[11px] font-bold uppercase text-emerald-400">
                        Admin Reply Sent
                      </span>
                      <p className="mt-1">{t.admin_reply}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="Write reply (triggers immediate mobile push + in-app notification)…"
                  value={replyDrafts[t.id] ?? ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={sendingId === t.id || !(replyDrafts[t.id] ?? "").trim()}
                  onClick={() => void handleReply(t.id)}
                  className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {sendingId === t.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Reply &amp; Push
                </button>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegalCmsTab({ onNotice }: { onNotice: (msg: string | null) => void }) {
  const [docs, setDocs] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slug, setSlug] = useState("privacy-policy");
  const [title, setTitle] = useState("");
  const [jurisdictions, setJurisdictions] = useState("Global · EU GDPR · US CCPA/CPRA");
  const [version, setVersion] = useState("1.0");
  const [sortOrder, setSortOrder] = useState(10);
  const [isPublished, setIsPublished] = useState(true);
  const [contentHtml, setContentHtml] = useState("");
  const [addingSlug, setAddingSlug] = useState(false);
  const [newSlugDraft, setNewSlugDraft] = useState("");

  const applyDoc = (doc: LegalDocumentItem) => {
    setSlug(doc.slug);
    setTitle(doc.title);
    setJurisdictions(doc.jurisdictions);
    setVersion(doc.version);
    setSortOrder(doc.sort_order);
    setIsPublished(doc.is_published);
    setContentHtml(doc.content_html);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAdminLegalDocuments();
        if (!active) return;
        setDocs(list);
        if (list.length > 0) {
          const matched = list.find((d) => d.slug === "privacy-policy") ?? list[0];
          if (matched) applyDoc(matched);
        }
      } catch (err) {
        if (active) onNotice(err instanceof Error ? err.message : "Failed to load legal documents");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [onNotice]);

  const handleCreateSlug = () => {
    const clean = newSlugDraft
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    if (!clean) {
      onNotice("Please enter a valid slug (letters, numbers, hyphens).");
      return;
    }
    setSlug(clean);
    setTitle("New Compliance Notice");
    setJurisdictions("Global · EU GDPR · US CCPA/CPRA");
    setVersion("1.0");
    setSortOrder(50);
    setIsPublished(true);
    setContentHtml("<h2>Overview</h2><p>Enter policy details…</p>");
    setNewSlugDraft("");
    setAddingSlug(false);
    onNotice(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onNotice(null);
    try {
      const saved = await upsertAdminLegalDocument(slug, {
        title,
        content_html: contentHtml,
        jurisdictions,
        version,
        is_published: isPublished,
        sort_order: sortOrder,
      });
      setDocs((prev) => {
        const idx = prev.findIndex((d) => d.slug === saved.slug);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      onNotice(`Saved "${saved.title}" (${saved.slug}).`);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to save legal document");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="hud-card flex items-center justify-center gap-2 py-12">
        <RefreshCw className="size-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading legal compliance documents…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="hud-card space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {docs.map((doc) => (
            <button
              key={doc.slug}
              type="button"
              onClick={() => {
                applyDoc(doc);
                onNotice(null);
              }}
              className={cn(
                "rounded-lg px-3.5 py-2 font-mono text-xs font-bold uppercase transition-colors",
                slug === doc.slug
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/40 text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {doc.slug}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAddingSlug((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 font-mono text-xs font-semibold text-foreground hover:border-primary"
          >
            <FilePlus2 className="size-3.5 text-primary" />
            Add Document
          </button>
          {addingSlug && (
            <div className="flex items-center gap-1.5">
              <input
                value={newSlugDraft}
                onChange={(e) => setNewSlugDraft(e.target.value)}
                placeholder="e.g. cookie-notice"
                aria-label="New legal document slug"
                className="min-h-[36px] w-44 rounded-lg border border-border bg-secondary/40 px-2.5 text-xs text-foreground"
              />
              <button
                type="button"
                onClick={handleCreateSlug}
                className="min-h-[36px] rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingSlug(false);
                  setNewSlugDraft("");
                }}
                className="min-h-[36px] rounded-lg border border-border px-2.5 text-xs text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <Link
          to="/privacy"
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          View Public /privacy →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
            Document Title *
          </label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
            Version
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
            Jurisdictions (GDPR / CCPA / Global)
          </label>
          <input
            type="text"
            value={jurisdictions}
            onChange={(e) => setJurisdictions(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
          <span className="font-mono text-xs font-semibold uppercase text-foreground">
            Published
          </span>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="size-5 accent-primary"
          />
        </label>
      </div>

      <div>
        <label className="mb-1 block font-mono text-xs font-semibold uppercase text-muted-foreground">
          Policy HTML Content (WYSIWYG) *
        </label>
        <RichTextEditor value={contentHtml} onChange={setContentHtml} />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Save Compliance Document
        </button>
      </div>
    </form>
  );
}
