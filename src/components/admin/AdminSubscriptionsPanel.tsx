import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Crown,
  History,
  Loader2,
  Plus,
  Search,
  ShieldX,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { ModalShell } from "@/components/revv/ModalShell";
import {
  assignAdminSubscription,
  fetchAdminSubscriptions,
  revokeAdminSubscription,
  type AdminSubscriptionItem,
  type AdminSubscriptionsPayload,
  type AdminUserItem,
  type SubscriptionTierCatalogItem,
} from "@/lib/api";

const FALLBACK_TIERS: SubscriptionTierCatalogItem[] = [
  {
    tier_code: "rookie",
    name: "REVV Rookie",
    is_paid: false,
    idr_weekly: 0,
    idr_monthly: 0,
    idr_yearly: 0,
    usd_weekly_cents: 0,
    usd_monthly_cents: 0,
    usd_yearly_cents: 0,
    includes_verified_frame: false,
  },
  {
    tier_code: "street",
    name: "REVV Street",
    is_paid: true,
    idr_weekly: 14900,
    idr_monthly: 29900,
    idr_yearly: 299000,
    usd_weekly_cents: 99,
    usd_monthly_cents: 199,
    usd_yearly_cents: 1999,
    includes_verified_frame: true,
  },
  {
    tier_code: "apex",
    name: "REVV Apex",
    is_paid: true,
    idr_weekly: 29900,
    idr_monthly: 59900,
    idr_yearly: 599000,
    usd_weekly_cents: 199,
    usd_monthly_cents: 399,
    usd_yearly_cents: 3999,
    includes_verified_frame: true,
  },
  {
    tier_code: "grand_tourer",
    name: "REVV Grand Tourer",
    is_paid: true,
    idr_weekly: 49900,
    idr_monthly: 99900,
    idr_yearly: 999000,
    usd_weekly_cents: 299,
    usd_monthly_cents: 699,
    usd_yearly_cents: 6999,
    includes_verified_frame: true,
  },
];

function formatTierName(code: string): string {
  switch (code) {
    case "street":
      return "REVV Street";
    case "apex":
      return "REVV Apex";
    case "grand_tourer":
      return "REVV Grand Tourer";
    default:
      return "REVV Rookie";
  }
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  const cur = (currency || "IDR").toUpperCase();
  if (cur === "IDR") {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
  return `${cur} ${amount.toLocaleString("en-US")}`;
}

export function AdminSubscriptionsPanel({
  users,
  onNotice,
  onReloadUsers,
}: {
  users: AdminUserItem[];
  onNotice: (msg: string | null) => void;
  onReloadUsers: () => Promise<void>;
}) {
  const [data, setData] = useState<AdminSubscriptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // Assign / Grant Modal State
  const [assignOpen, setAssignOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tierCode, setTierCode] = useState<string>("apex");
  const [billingPeriod, setBillingPeriod] = useState<string>("monthly");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [currency, setCurrency] = useState<string>("IDR");
  const [amount, setAmount] = useState<number>(59900);
  const [paymentChannel, setPaymentChannel] = useState<string>("admin_manual");
  const [paidByLabel, setPaidByLabel] = useState<string>("");
  const [isConsecutive, setIsConsecutive] = useState<boolean>(true);
  const [consecutiveMonths, setConsecutiveMonths] = useState<number>(1);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [pendingRevoke, setPendingRevoke] = useState<AdminSubscriptionItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAdminSubscriptions();
      setData(payload);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Failed to load paid users & subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const tiers = data?.tiers?.length ? data.tiers : FALLBACK_TIERS;

  const applyTierDefaults = (nextTier: string, nextPeriod: string, nextCurrency: string) => {
    const t = tiers.find((item) => item.tier_code === nextTier);
    const days =
      nextPeriod === "weekly"
        ? 7
        : nextPeriod === "yearly"
          ? 365
          : nextPeriod === "lifetime"
            ? 36500
            : 30;
    setDurationDays(days);
    if (!t || nextTier === "rookie") {
      setAmount(0);
      return;
    }
    if (nextCurrency === "USD") {
      const cents =
        nextPeriod === "weekly"
          ? t.usd_weekly_cents
          : nextPeriod === "yearly"
            ? t.usd_yearly_cents
            : t.usd_monthly_cents;
      setAmount(Math.round(cents / 100));
    } else {
      const idr =
        nextPeriod === "weekly"
          ? t.idr_weekly
          : nextPeriod === "yearly"
            ? t.idr_yearly
            : t.idr_monthly;
      setAmount(idr);
    }
  };

  const openAssignModal = (presetUserId?: string, presetTier?: string) => {
    const targetTier = presetTier || "apex";
    setSelectedUserId(presetUserId || users[0]?.id || "");
    setUserSearch("");
    setTierCode(targetTier);
    setBillingPeriod("monthly");
    setCurrency("IDR");
    setPaymentChannel("admin_manual");
    setPaidByLabel("");
    setIsConsecutive(true);
    setConsecutiveMonths(1);
    setAdminNotes("");
    setModalError(null);
    applyTierDefaults(targetTier, "monthly", "IDR");
    setAssignOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalError("Select a user account first.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      await assignAdminSubscription({
        user_id: selectedUserId,
        tier_code: tierCode,
        billing_period: billingPeriod,
        duration_days: durationDays,
        currency,
        amount,
        payment_method: paymentChannel === "admin_manual" ? "admin_grant" : paymentChannel,
        payment_provider: paymentChannel,
        payment_channel: paymentChannel,
        is_consecutive: isConsecutive,
        consecutive_months: consecutiveMonths,
        ...(paidByLabel.trim() ? { paid_by_label: paidByLabel.trim() } : {}),
        ...(adminNotes.trim() ? { admin_notes: adminNotes.trim() } : {}),
      });
      setAssignOpen(false);
      onNotice(
        `Updated subscription tier (${formatTierName(tierCode)}) & verified frame entitlements.`,
      );
      await Promise.all([loadSubscriptions(), onReloadUsers()]);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to update tier.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      await revokeAdminSubscription(pendingRevoke.id, "Revoked from administrator command deck");
      setPendingRevoke(null);
      onNotice(`Revoked subscription for @${pendingRevoke.username}.`);
      await Promise.all([loadSubscriptions(), onReloadUsers()]);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to revoke subscription.");
    } finally {
      setRevoking(false);
    }
  };

  const filteredSubs = useMemo(() => {
    const items = data?.subscriptions ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) return false;
      if (tierFilter !== "all" && item.tier_code.toLowerCase() !== tierFilter) return false;
      if (!term) return true;
      return (
        item.username.toLowerCase().includes(term) ||
        item.display_name.toLowerCase().includes(term) ||
        (item.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [data?.subscriptions, search, statusFilter, tierFilter]);

  const pickerUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 80);
    return users
      .filter(
        (u) =>
          (u.username ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [users, userSearch]);

  const consecutiveCount = (data?.subscriptions ?? []).filter(
    (s) => s.status === "Active" && s.is_consecutive && s.consecutive_months >= 2,
  ).length;
  const verifiedEquippedCount = (data?.subscriptions ?? []).filter(
    (s) => s.status === "Active" && Boolean(s.equipped_frame_code),
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="hud-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Active Paid Users</span>
            <Crown className="size-4 text-primary" />
          </div>
          <p className="font-display mt-2 text-3xl font-black text-foreground">
            {data?.active_count ?? 0}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Granted role paid_user + verified frame
          </p>
        </div>

        <div className="hud-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Verified Frames Active</span>
            <BadgeCheck className="size-4 text-sky-400" />
          </div>
          <p className="font-display mt-2 text-3xl font-black text-foreground">
            {verifiedEquippedCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Sea-blue &amp; tosca curved aura equipped
          </p>
        </div>

        <div className="hud-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Consecutive Patrons</span>
            <Calendar className="size-4 text-emerald-400" />
          </div>
          <p className="font-display mt-2 text-3xl font-black text-foreground">
            {consecutiveCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Streak &ge; 2 consecutive months
          </p>
        </div>

        <div className="hud-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Tracked Ledger Rows</span>
            <History className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display mt-2 text-3xl font-black text-foreground">
            {data?.total_count ?? 0}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Feature limits deferred to billing launch
          </p>
        </div>
      </div>

      {/* Filters + Primary Grant CTA */}
      <div className="hud-card flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search @username, name, email..."
              className="w-full rounded-lg border border-border bg-secondary/40 py-1.5 pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
          >
            <option value="all">All Tiers</option>
            <option value="street">REVV Street</option>
            <option value="apex">REVV Apex</option>
            <option value="grand_tourer">REVV Grand Tourer</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => openAssignModal()}
          className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Plus className="size-3.5" />
          Set Paid Tier / Assign Frame
        </button>
      </div>

      {/* Subscriptions Ledger Table */}
      <div className="hud-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/70 bg-secondary/20 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              <tr>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Tier &amp; Period</th>
                <th className="px-4 py-3">Status &amp; Streak</th>
                <th className="px-4 py-3">Billing &amp; Channel</th>
                <th className="px-4 py-3">Frame &amp; Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center font-mono text-muted-foreground"
                  >
                    No paid user records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-secondary/15">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{sub.display_name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        @{sub.username} &bull; role: {sub.user_role}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-primary">
                        <Crown className="size-3" />
                        {formatTierName(sub.tier_code)}
                      </span>
                      <div className="mt-1 font-mono text-[11px] uppercase text-muted-foreground">
                        {sub.billing_period} ({sub.duration_days ?? 30}d)
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                          sub.status === "Active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {sub.status}
                      </span>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {sub.is_consecutive ? "Consecutive" : "Non-consecutive"} &bull;{" "}
                        {sub.consecutive_months} mo ({sub.total_paid_days}d)
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {formatMoney(sub.amount, sub.currency)}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {sub.payment_channel || sub.payment_provider || "admin_manual"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400">
                        <BadgeCheck className="size-3.5" />
                        {sub.equipped_frame_code || "none"}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        Until:{" "}
                        {sub.active_until
                          ? new Date(sub.active_until).toLocaleDateString()
                          : "Permanent"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAssignModal(sub.user_id, sub.tier_code)}
                          className="btn-ghost px-2.5 py-1 font-mono text-[11px] uppercase"
                        >
                          Edit Tier
                        </button>
                        {sub.status === "Active" && (
                          <button
                            type="button"
                            onClick={() => setPendingRevoke(sub)}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 font-mono text-[11px] uppercase text-destructive hover:bg-destructive/20"
                          >
                            <ShieldX className="size-3" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit Ledger Events */}
      {(data?.events?.length ?? 0) > 0 && (
        <div className="hud-card p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <History className="size-4 text-primary" />
            Recent Subscription Ledger Events
          </div>
          <div className="space-y-2">
            {(data?.events ?? []).slice(0, 10).map((evt) => (
              <div
                key={evt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2 font-mono text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span className="font-bold text-foreground">@{evt.username}</span>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">
                    {evt.event_type}
                  </span>
                  <span className="text-muted-foreground">
                    {evt.previous_tier ?? "rookie"} &rarr; {evt.new_tier ?? "rookie"}
                    {evt.delta_days ? ` (+${evt.delta_days}d)` : ""}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  by @{evt.actor_username ?? "system"} &bull;{" "}
                  {new Date(evt.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grant / Change Paid Tier Modal */}
      <ModalShell
        open={assignOpen}
        onClose={() => !saving && setAssignOpen(false)}
        title="Assign Paid User Tier"
        subtitle="Select user, subscription tier, duration & consecutive patron tracking (verified frame synced automatically)."
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {modalError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              {modalError}
            </div>
          )}

          <div>
            <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
              Find Rider Account
            </label>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter users by @username, name or email..."
              className="mb-2 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
            />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
            >
              {pickerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  @{u.username ?? "no-username"} — {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Subscription Tier
              </label>
              <select
                value={tierCode}
                onChange={(e) => {
                  const nextTier = e.target.value;
                  setTierCode(nextTier);
                  applyTierDefaults(nextTier, billingPeriod, currency);
                }}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              >
                {tiers.map((t) => (
                  <option key={t.tier_code} value={t.tier_code}>
                    {t.name} {t.is_paid ? "(Verified Frame)" : "(Free)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Billing Period
              </label>
              <select
                value={billingPeriod}
                disabled={tierCode === "rookie"}
                onChange={(e) => {
                  const nextP = e.target.value;
                  setBillingPeriod(nextP);
                  applyTierDefaults(tierCode, nextP, currency);
                }}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground disabled:opacity-50"
              >
                <option value="weekly">Weekly (7 days)</option>
                <option value="monthly">Monthly (30 days)</option>
                <option value="yearly">Yearly (365 days)</option>
                <option value="lifetime">Lifetime (9999yr)</option>
                <option value="custom">Custom Duration</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={36500}
                disabled={tierCode === "rookie"}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Currency
              </label>
              <select
                value={currency}
                disabled={tierCode === "rookie"}
                onChange={(e) => {
                  const nextCur = e.target.value;
                  setCurrency(nextCur);
                  applyTierDefaults(tierCode, billingPeriod, nextCur);
                }}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              >
                <option value="IDR">IDR (Rp)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Amount ({currency})
              </label>
              <input
                type="number"
                min={0}
                disabled={tierCode === "rookie"}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Consecutive Months
              </label>
              <input
                type="number"
                min={1}
                max={120}
                disabled={tierCode === "rookie"}
                value={consecutiveMonths}
                onChange={(e) => setConsecutiveMonths(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Payment Channel
              </label>
              <select
                value={paymentChannel}
                disabled={tierCode === "rookie"}
                onChange={(e) => setPaymentChannel(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              >
                <option value="admin_manual">Admin Grant</option>
                <option value="google_play">Google Play</option>
                <option value="app_store">App Store</option>
                <option value="midtrans">Midtrans</option>
                <option value="xendit">Xendit</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 font-mono text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={isConsecutive}
                  onChange={(e) => setIsConsecutive(e.target.checked)}
                />
                Consecutive Patron
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Paid By Label (Encrypted at Rest)
              </label>
              <input
                type="text"
                value={paidByLabel}
                onChange={(e) => setPaidByLabel(e.target.value)}
                placeholder="e.g. Manual Transfer / Admin Comp"
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                Admin Notes
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reason / tracker note..."
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setAssignOpen(false)}
              className="btn-ghost px-4 py-2 font-mono text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Save Tier &amp; Sync Frame
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        title="Revoke Paid Subscription?"
        message={`Downgrade @${pendingRevoke?.username ?? ""} back to REVV Rookie and deactivate subscriber-only verified frame?`}
        confirmLabel="Revoke Tier"
        cancelLabel="Cancel"
        destructive
        busy={revoking}
        onConfirm={handleConfirmRevoke}
        onCancel={() => !revoking && setPendingRevoke(null)}
      />
    </div>
  );
}
