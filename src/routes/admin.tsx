import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  AtSign,
  Bell,
  CheckCircle2,
  CloudOff,
  Database,
  FilePlus2,
  FileText,
  ImagePlus,
  Loader2,
  Megaphone,
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
  Users,
  Wrench,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { RequireRole } from "@/components/revv/RequireRole";
import { RichTextEditor } from "@/components/revv/RichTextEditor";
import { AdminOverviewAnalyticsPanel } from "@/components/admin/AdminOverviewAnalyticsPanel";
import { AdminCosmeticsPanel } from "@/components/admin/AdminCosmeticsPanel";
import { AdminSubscriptionsPanel } from "@/components/admin/AdminSubscriptionsPanel";
import { AdminUsersTablePanel } from "@/components/admin/AdminUsersTablePanel";
import { AdminMasterDataPanel, type MasterSubTab } from "@/components/admin/AdminMasterDataPanel";
import {
  type AdminAnalyticsResponse,
  type AdminDashboardStats,
  type AdminSystemStatusRecord,
  type AdminUserItem,
  type BroadcastNotificationItem,
  createAdminNewsArticle,
  deleteAdminNewsArticle,
  deleteAdminUser,
  fetchAdminAnalytics,
  fetchAdminBrands,
  fetchAdminBroadcasts,
  fetchAdminComponents,
  fetchAdminDashboard,
  fetchAdminEmailTemplates,
  fetchAdminGeneralSettings,
  fetchAdminLegalDocuments,
  fetchAdminMotorcycles,
  fetchAdminNewsArticles,
  fetchAdminNotificationTemplates,
  fetchAdminSupportTickets,
  fetchAdminSystemStatus,
  fetchAdminUsers,
  type LegalDocumentItem,
  type MasterBrandItem,
  type MasterComponentItem,
  type MasterEmailTemplateItem,
  type MasterGeneralSettingItem,
  type MasterMotorcycleItem,
  type MasterNotificationTemplateItem,
  type NewsArticle,
  replyAdminSupportTicket,
  resolveMediaUrl,
  sendAdminBroadcast,
  type SupportTicketItem,
  updateAdminNewsArticle,
  updateAdminSystemStatus,
  updateAdminUser,
  uploadCompressedMedia,
  upsertAdminLegalDocument,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccessAdmin, cn, isAdminRole, isModeratorRole } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administrator Command Console — REVV Web" },
      {
        name: "description",
        content:
          "REVV Superuser Command Center for overview analytics, users & RBAC, master data, news CMS, and push broadcast.",
      },
    ],
  }),
  component: AdminPageGuard,
});

function AdminPageGuard() {
  return (
    <RequireRole
      allowed={canAccessAdmin}
      loadingFallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminPage />
    </RequireRole>
  );
}

type AdminSubTab =
  | "overview"
  | "users"
  | "subscriptions"
  | "cosmetics"
  | "master"
  | "news"
  | "broadcast"
  | "support"
  | "legal"
  | "maintenance";

type AdminConfirmAction =
  | { kind: "change_role"; user: AdminUserItem; nextRole: string }
  | { kind: "change_status"; user: AdminUserItem; nextStatus: string }
  | { kind: "soft_delete_user"; user: AdminUserItem };

const NEWS_CATEGORIES = ["EDITORIAL", "UPDATE", "SAFETY", "COMMUNITY", "TELEMETRY", "EVENT"];

function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchObj = (location.search ?? {}) as Record<string, string | undefined>;
  const isSuperuser = isAdminRole(user?.role);
  const isModerator = isModeratorRole(user?.role);
  const canEnterConsole = canAccessAdmin(user?.role);

  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("overview");
  const [activeMasterSub, setActiveMasterSub] = useState<MasterSubTab>("brands");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<AdminConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Data states
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsResponse | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminBrands, setAdminBrands] = useState<MasterBrandItem[]>([]);
  const [adminMotorcycles, setAdminMotorcycles] = useState<MasterMotorcycleItem[]>([]);
  const [adminComponents, setAdminComponents] = useState<MasterComponentItem[]>([]);
  const [notifTemplates, setNotifTemplates] = useState<MasterNotificationTemplateItem[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<MasterEmailTemplateItem[]>([]);
  const [generalSettings, setGeneralSettings] = useState<MasterGeneralSettingItem[]>([]);
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

  // Broadcast push form inputs
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTargetType, setBroadcastTargetType] = useState<"all" | "user">("all");
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState<string>("");
  const [broadcastDeepLink, setBroadcastDeepLink] = useState("notifications");
  const [broadcastIsSending, setBroadcastIsSending] = useState(false);

  // Sync tab with URL search params (?tab=...&sub=...)
  const searchTab = searchObj["tab"];
  const searchSub = searchObj["sub"];
  useEffect(() => {
    if (isModerator && !isSuperuser) {
      setActiveSubTab(searchTab === "overview" ? "overview" : "news");
      return;
    }
    if (
      searchTab === "overview" ||
      searchTab === "users" ||
      searchTab === "subscriptions" ||
      searchTab === "cosmetics" ||
      searchTab === "master" ||
      searchTab === "news" ||
      searchTab === "broadcast" ||
      searchTab === "support" ||
      searchTab === "legal" ||
      searchTab === "maintenance"
    ) {
      setActiveSubTab(searchTab);
    }
    if (
      searchSub === "brands" ||
      searchSub === "components" ||
      searchSub === "notifications" ||
      searchSub === "emails" ||
      searchSub === "settings"
    ) {
      setActiveMasterSub(searchSub);
    }
  }, [searchTab, searchSub, isModerator, isSuperuser]);

  const selectSubTab = (tab: AdminSubTab) => {
    setActiveSubTab(tab);
    void navigate({
      to: "/admin",
      search: (tab === "master" ? { tab, sub: activeMasterSub } : { tab }) as never,
      replace: true,
    });
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    setConfirmBusy(true);
    try {
      if (pendingConfirm.kind === "change_role") {
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

  const refreshAllAdminData = useCallback(async () => {
    try {
      setLoading(true);
      let failedCount = 0;
      const track = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
        promise.catch(() => {
          failedCount += 1;
          return fallback;
        });

      if (isModerator && !isSuperuser) {
        const [statsRes, newsRes] = await Promise.all([
          track(fetchAdminDashboard(), null),
          track(fetchAdminNewsArticles(), []),
        ]);
        if (statsRes) setAdminStats(statsRes);
        setAdminNews(newsRes);
        if (failedCount > 0) {
          setNotice(
            `${failedCount} administrator data request${failedCount === 1 ? "" : "s"} failed to load.`,
          );
        }
        return;
      }

      const [
        stats,
        analyticsRes,
        users,
        brands,
        motos,
        comps,
        notifs,
        emails,
        settings,
        newsRes,
        broadcasts,
        sysStatus,
      ] = await Promise.all([
        track(fetchAdminDashboard(), null),
        track(fetchAdminAnalytics(), null),
        track(fetchAdminUsers(), []),
        track(fetchAdminBrands(), []),
        track(fetchAdminMotorcycles(), []),
        track(fetchAdminComponents(), []),
        track(fetchAdminNotificationTemplates(), []),
        track(fetchAdminEmailTemplates(), []),
        track(fetchAdminGeneralSettings(), []),
        track(fetchAdminNewsArticles(), []),
        track(fetchAdminBroadcasts(), []),
        track(fetchAdminSystemStatus(), null),
      ]);
      setAdminStats(stats);
      setAnalyticsData(analyticsRes);
      setAdminUsers(users);
      setAdminBrands(brands);
      setAdminMotorcycles(motos);
      setAdminComponents(comps);
      setNotifTemplates(notifs);
      setEmailTemplates(emails);
      setGeneralSettings(settings);
      setAdminNews(newsRes);
      setAdminBroadcasts(broadcasts);
      if (sysStatus) {
        setSystemStatus(sysStatus);
        setIsMaintenance(sysStatus.is_maintenance);
        setStatusTitle(sysStatus.title);
        setStatusMessage(sysStatus.message);
        setStatusIcon(sysStatus.icon);
      }
      if (failedCount > 0) {
        setNotice(
          `${failedCount} administrator data request${failedCount === 1 ? "" : "s"} failed to load.`,
        );
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to load administrator data.");
    } finally {
      setLoading(false);
    }
  }, [isModerator, isSuperuser]);

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
    if (isAuthenticated && canEnterConsole) {
      refreshAllAdminData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, canEnterConsole, refreshAllAdminData]);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <ShieldCheck className="size-3.5" />
            <span>{isSuperuser ? "Superuser Command Deck" : "Editorial Moderation"}</span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isSuperuser ? "Administrator Console" : "Moderator News Desk"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Role: <span className="font-bold uppercase text-primary">{user?.role}</span> ·{" "}
            {isSuperuser
              ? "Realtime Control for Roster, Catalog, RBAC, and Push Broadcasts."
              : "Compose, edit, and publish Newsroom dispatches directly."}
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
            className="hover:underline uppercase text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Section Banner (Sidebar-driven navigation) */}
      {!isSuperuser && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          Moderator Access — Editorial News Management
        </div>
      )}

      {loading ? (
        <div className="hud-card flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {(isSuperuser || isModerator) && activeSubTab === "overview" && (
            <AdminOverviewAnalyticsPanel adminStats={adminStats} analytics={analyticsData} />
          )}

          {/* TAB 2: USERS & RBAC TABLE + DETAIL MODAL */}
          {isSuperuser && activeSubTab === "users" && (
            <AdminUsersTablePanel
              users={adminUsers}
              currentUserId={user?.id}
              currentUserEmail={user?.email}
              onReload={async () => {
                setAdminUsers(await fetchAdminUsers());
              }}
              onNotice={setNotice}
              onRequestSoftDelete={(u) => setPendingConfirm({ kind: "soft_delete_user", user: u })}
            />
          )}

          {/* TAB 2B: PAID USERS & SUBSCRIPTION TIER MANAGEMENT */}
          {isSuperuser && activeSubTab === "subscriptions" && (
            <AdminSubscriptionsPanel
              users={adminUsers}
              onNotice={setNotice}
              onReloadUsers={async () => {
                setAdminUsers(await fetchAdminUsers());
              }}
            />
          )}

          {/* TAB 2C: DB LOTTIE COSMETICS & LIVE PRICING */}
          {isSuperuser && activeSubTab === "cosmetics" && <AdminCosmeticsPanel />}

          {/* TAB 3: MASTER DATA SUB-SUBMENUS */}
          {isSuperuser && activeSubTab === "master" && (
            <AdminMasterDataPanel
              activeMasterSub={activeMasterSub}
              brands={adminBrands}
              motorcycles={adminMotorcycles}
              components={adminComponents}
              notifTemplates={notifTemplates}
              emailTemplates={emailTemplates}
              generalSettings={generalSettings}
              onReload={async () => {
                const [brands, motos, comps, notifs, emails, settings] = await Promise.all([
                  fetchAdminBrands().catch(() => []),
                  fetchAdminMotorcycles().catch(() => []),
                  fetchAdminComponents().catch(() => []),
                  fetchAdminNotificationTemplates().catch(() => []),
                  fetchAdminEmailTemplates().catch(() => []),
                  fetchAdminGeneralSettings().catch(() => []),
                ]);
                setAdminBrands(brands);
                setAdminMotorcycles(motos);
                setAdminComponents(comps);
                setNotifTemplates(notifs);
                setEmailTemplates(emails);
                setGeneralSettings(settings);
              }}
              onNotice={setNotice}
            />
          )}

          {/* TAB 4: NEWS CMS (ADMIN & MODERATOR) */}
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
          {isSuperuser && activeSubTab === "broadcast" && (
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
                    <p className="text-right text-xs text-foreground/75">
                      {broadcastBody.length} / 500
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>In-App Deep Link / Target Route</span>
                      <span className="text-xs text-primary font-bold uppercase tracking-wider">
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
                          {adminNews.map((article, idx) => (
                            <option
                              key={article.id || article.slug || `news-${idx}`}
                              value={`news/${article.slug}`}
                            >
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
                    <p className="text-sm text-foreground/75 flex items-center justify-between pt-0.5">
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

                  <div className="mx-auto max-w-sm rounded-2xl border border-border/80 bg-slate-950 p-4 text-slate-100 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="size-3 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          REVV Mobile Push · now
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">12:30</span>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm">
                        R
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-100">REVV Motorsport</span>
                          <span className="text-xs font-semibold text-primary uppercase">
                            {broadcastTargetType === "all" ? "BROADCAST" : "TARGETED"}
                          </span>
                        </div>
                        <h5 className="mt-0.5 font-bold text-xs text-slate-100 line-clamp-1">
                          {broadcastTitle.trim() || "Notification Title Here"}
                        </h5>
                        <p className="mt-0.5 text-xs leading-snug text-slate-300 line-clamp-2">
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
                            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-bold uppercase text-primary">
                              {b.target_type}
                            </span>
                            <h5 className="font-bold text-sm text-foreground">{b.title}</h5>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{b.body}</p>
                        </div>
                        <div className="text-sm text-foreground/75 text-right">
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
          {isSuperuser && activeSubTab === "support" && <SupportInboxTab onNotice={setNotice} />}

          {/* PRIVACY & GLOBAL COMPLIANCE CMS */}
          {isSuperuser && activeSubTab === "legal" && <LegalCmsTab onNotice={setNotice} />}

          {/* TAB 7: SYSTEM HEALTH & MAINTENANCE CONTROL */}
          {isSuperuser && activeSubTab === "maintenance" && (
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
                      <span className="text-sm text-foreground/75">
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
                    <p className="text-xs text-foreground/75 text-center">
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
                  <div className="mx-auto w-full max-w-xs rounded-[28px] border-2 border-border/80 bg-slate-950 text-slate-100 p-5 shadow-2xl space-y-6 text-center my-auto">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between text-xs text-foreground/75 px-1">
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
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
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
                      <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
                        {statusMessage.trim() ||
                          "We are performing scheduled maintenance and performance upgrades on REVV servers."}
                      </p>
                    </div>

                    {/* Simulated Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="rounded-xl bg-primary/20 border border-primary/50 py-2.5 text-center text-xs font-bold text-primary font-mono uppercase">
                        Refresh Status
                      </div>
                      <div className="rounded-xl border border-border/40 py-2 text-center text-xs text-foreground/75">
                        Administrator Access
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-xs text-foreground/75">
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
          pendingConfirm?.kind === "change_role"
            ? "Change User Role"
            : pendingConfirm?.kind === "change_status"
              ? "Change Account Status"
              : "Soft-Delete User"
        }
        message={
          pendingConfirm?.kind === "change_role"
            ? `Change role of ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextRole.toUpperCase()}?`
            : pendingConfirm?.kind === "change_status"
              ? `Change status of ${pendingConfirm.user.email || pendingConfirm.user.username} to ${pendingConfirm.nextStatus.toUpperCase()}?`
              : pendingConfirm?.kind === "soft_delete_user"
                ? `Soft-delete ${pendingConfirm.user.email || pendingConfirm.user.username}? All active bearer sessions will be immediately invalidated.`
                : ""
        }
        confirmLabel={pendingConfirm?.kind === "soft_delete_user" ? "Soft Delete" : "Confirm"}
        destructive={pendingConfirm?.kind === "soft_delete_user"}
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
    const strippedBody = content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!title.trim() || !strippedBody) {
      onNotice("Please provide both a headline title and non-empty article content.");
      return;
    }
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
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold uppercase text-primary-foreground"
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
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase text-primary">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.high_importance && (
                      <span
                        title="High Importance Push Sent"
                        className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary"
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

      {/* Inline Article WYSIWYG Canvas matching /news */}
      <form onSubmit={handleSubmit} className="hud-card overflow-hidden p-0">
        {/* Top Metadata & Cover Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/35 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display text-lg font-bold text-foreground">
              {editingId ? "Edit Dispatch" : "Compose Dispatch"}
            </h3>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              WYSIWYG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary">
              {uploadingCover ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <ImagePlus className="size-3.5 text-primary" />
              )}
              {coverUrl ? "Replace Cover" : "Add Cover Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </label>
            {coverUrl && (
              <button
                type="button"
                onClick={() => {
                  setCoverUrl("");
                  setThumbnailUrl("");
                }}
                className="rounded-xl border border-destructive/40 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                Remove Cover
              </button>
            )}
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                New Draft
              </button>
            )}
          </div>
        </div>

        {/* Cover Banner rendered inline 1:1 like /news */}
        {coverUrl && (
          <div className="relative h-56 w-full overflow-hidden border-b border-border bg-secondary">
            <img
              src={resolveMediaUrl(coverUrl) ?? undefined}
              alt="Article cover preview"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-5 p-6 md:p-8">
          {/* Article Meta Bar (Category, Author, Read Time) */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={NEWS_CATEGORIES.includes(category) ? category : "CUSTOM"}
              onChange={(e) => setCategory(e.target.value === "CUSTOM" ? "" : e.target.value)}
              aria-label="Article Category"
              className="rounded-lg bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground outline-none"
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="CUSTOM">Custom…</option>
            </select>
            {!NEWS_CATEGORIES.includes(category) && (
              <input
                type="text"
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                className="w-32 rounded-lg border border-input bg-secondary/40 px-2.5 py-1 text-xs font-bold uppercase text-foreground outline-none focus:border-primary"
              />
            )}

            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author"
              aria-label="Author name"
              className="w-40 rounded-lg border border-border bg-secondary/35 px-2.5 py-1 text-xs font-medium text-foreground outline-none focus:border-primary"
            />

            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="number"
                min={1}
                max={60}
                value={readingMinutes}
                onChange={(e) => setReadingMinutes(Number(e.target.value) || 3)}
                className="w-14 rounded-lg border border-border bg-secondary/35 px-2 py-1 text-center text-xs font-semibold text-foreground outline-none focus:border-primary"
              />
              <span>min read</span>
            </label>
          </div>

          {/* Inline Article Headline Input */}
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write article headline..."
            className="w-full border-none bg-transparent font-display text-2xl font-extrabold tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none sm:text-3xl"
          />

          {/* Summary Lead */}
          <textarea
            required
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Concise summary displayed in Newsroom & feed cards…"
            className="w-full rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-sm leading-relaxed text-foreground/90 outline-none focus:border-primary"
          />

          {/* Live Inline WYSIWYG Canvas matching .revv-rich-html */}
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write formatted article content directly as it will appear in /news..."
          />

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3.5">
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
                    Send push notification to active riders
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
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-primary">
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
                              "text-xs font-bold uppercase",
                              isAdmin ? "text-emerald-400" : "text-primary",
                            )}
                          >
                            {isAdmin
                              ? m.sender_name || "Support Team (Admin)"
                              : m.sender_name || t.reporter_name}
                          </span>
                          <span className="text-sm text-foreground/75">
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
                      <span className="block text-xs font-bold uppercase text-emerald-400">
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
