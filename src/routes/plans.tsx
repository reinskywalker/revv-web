import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { AccountDeletionCard } from "@/components/billing/AccountDeletionCard";
import { ClubBoostSection } from "@/components/billing/ClubBoostSection";
import { CosmeticsShopSection } from "@/components/billing/CosmeticsShopSection";
import { PendingOrderBanner } from "@/components/billing/PendingOrderBanner";
import { QuickPassesSection } from "@/components/billing/QuickPassesSection";
import { SubscriptionPlansSection } from "@/components/billing/SubscriptionPlansSection";
import {
  cancelMySubscription,
  createPaymentCheckout,
  equipMyAvatarFrame,
  equipMyCosmeticBadges,
  fetchPaymentOrderStatus,
  fetchSubscriptionPlansCatalog,
  formatDbPrice,
  type PaymentOrderDto,
  requestAccountDeletion,
  type SubscriptionPlansCatalogResponse,
} from "@/lib/api-billing";
import { fetchCommunities, type CommunitySummary } from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import {
  clearCosmeticsMemoryCache,
  type CosmeticsCatalogResponse,
  fetchCosmeticsCatalogCached,
} from "@/lib/cosmetics-cache";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans, Passes, Club Boost & Cosmetics — REVV" },
      {
        name: "description",
        content:
          "REVV Weekday/Weekend traffic navigation passes, Throttle & Apex subscriptions, Paddock Club Boost, and animated cosmetics.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const searchObj = (location.search ?? {}) as Record<string, string | undefined>;
  const preselectedClubId = searchObj["boostClub"] ?? "";

  const [billingCatalog, setBillingCatalog] = useState<SubscriptionPlansCatalogResponse | null>(
    null,
  );
  const [cosmetics, setCosmetics] = useState<CosmeticsCatalogResponse | null>(null);
  const [myClubs, setMyClubs] = useState<CommunitySummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [selectedBoostClubId, setSelectedBoostClubId] = useState(preselectedClubId);
  const [selectedProvider, setSelectedProvider] = useState<"midtrans" | "doku">("midtrans");
  const [selectedChannel, setSelectedChannel] = useState("qris");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PaymentOrderDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cosPromise = fetchCosmeticsCatalogCached(true);
      if (isAuthenticated) {
        const [plansRes, cosRes, clubsRes] = await Promise.all([
          fetchSubscriptionPlansCatalog(),
          cosPromise,
          fetchCommunities({ joined_only: true }).catch(() => []),
        ]);
        setBillingCatalog(plansRes);
        setCosmetics(cosRes);
        setMyClubs(clubsRes);
        if (!selectedBoostClubId && clubsRes.length > 0) {
          setSelectedBoostClubId(preselectedClubId || clubsRes[0]!.id);
        }
        if (plansRes.pending_orders.length > 0 && !activeOrder) {
          setActiveOrder(plansRes.pending_orders[0]!);
        }
      } else {
        setCosmetics(await cosPromise);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pricing catalog.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, preselectedClubId, selectedBoostClubId, activeOrder]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCheckout = async (params: {
    item_type: "subscription" | "club_boost" | "cosmetic_frame" | "cosmetic_badge";
    item_code: string;
    billing_period?: string;
    target_community_id?: string;
    key: string;
  }) => {
    if (!isAuthenticated) {
      setError(t("billing.checkoutSignInRequired"));
      return;
    }
    setBusyAction(params.key);
    setError(null);
    setNotice(null);
    try {
      const idemKey = `web_${params.item_type}_${params.item_code}_${params.billing_period ?? "once"}_${Date.now()}`;
      const res = await createPaymentCheckout({
        provider: selectedProvider,
        item_type: params.item_type,
        item_code: params.item_code,
        billing_period: params.billing_period,
        target_community_id: params.target_community_id,
        payment_channel: selectedChannel,
        idempotency_key: idemKey,
      });
      setActiveOrder(res.order);
      setNotice(
        res.reused
          ? t("billing.orderResumed", { code: res.order.order_code })
          : t("billing.orderCreated", {
              code: res.order.order_code,
              amount: formatDbPrice(res.order.currency, res.order.expected_amount),
              provider: `${selectedProvider.toUpperCase()} (${selectedChannel.toUpperCase()})`,
            }),
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckOrderStatus = async (orderCode: string) => {
    setBusyAction(`poll_${orderCode}`);
    setError(null);
    try {
      const res = await fetchPaymentOrderStatus(orderCode);
      setActiveOrder(res.order);
      setNotice(
        t("billing.orderStatusUpdated", {
          code: res.order.order_code,
          status: res.order.status,
        }),
      );
      if (res.order.status === "SETTLED") {
        clearCosmeticsMemoryCache();
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check payment status.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelRenewal = async () => {
    setBusyAction("cancel_sub");
    setError(null);
    try {
      const res = await cancelMySubscription("Cancelled via Web Plans portal");
      const dateStr = res.active_until
        ? new Date(res.active_until).toLocaleDateString()
        : "period end";
      setNotice(t("billing.cancelSuccess", { date: dateStr }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel renewal.");
    } finally {
      setBusyAction(null);
    }
  };

  const equippedBadges = useMemo(
    () => (cosmetics?.badges ?? []).filter((b) => b.equipped).map((b) => b.code),
    [cosmetics],
  );

  const toggleEquipBadge = async (badgeCode: string) => {
    const next = equippedBadges.includes(badgeCode)
      ? equippedBadges.filter((c) => c !== badgeCode)
      : [...equippedBadges.slice(0, 2), badgeCode];
    setBusyAction(`equip_badge_${badgeCode}`);
    try {
      await equipMyCosmeticBadges(next);
      clearCosmeticsMemoryCache();
      setNotice(t("billing.badgesUpdated"));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update equipped badges.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleEquipFrame = async (frameCode: string | null) => {
    setBusyAction(`equip_frame_${frameCode ?? "none"}`);
    try {
      await equipMyAvatarFrame(frameCode);
      clearCosmeticsMemoryCache();
      setNotice(t("billing.frameUpdated"));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update avatar frame.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestDeletion = async (reason: string) => {
    setBusyAction("delete_account");
    setError(null);
    try {
      await requestAccountDeletion(reason.trim() || undefined);
      setNotice(t("billing.deletionSubmitted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit deletion request.");
    } finally {
      setBusyAction(null);
    }
  };

  const region = billingCatalog?.pricing_region ?? cosmetics?.pricing_region ?? "GLOBAL";
  const currency = billingCatalog?.currency ?? cosmetics?.currency ?? "USD";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-6 pb-20 pt-24">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-bold uppercase text-primary">
            <ShieldCheck className="size-3.5" />
            {t("billing.heroEyebrow")}
          </span>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
            {t("billing.heroTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("billing.heroSubtitle", { region, currency })}
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <span className="text-sm text-muted-foreground">{t("billing.signInNotice")}</span>
              <Link
                to="/login"
                className="rounded-lg bg-primary px-4 py-2 font-display text-xs font-bold uppercase text-primary-foreground"
              >
                {t("nav.signIn")}
              </Link>
            </div>
          ) : (
            billingCatalog && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div className="space-y-1">
                  <div className="font-display text-sm font-black uppercase">
                    {t("billing.currentTier", {
                      tier: billingCatalog.entitlements.tier_code.toUpperCase(),
                    })}
                  </div>
                  {billingCatalog.entitlements.active_until && (
                    <div className="font-mono text-xs text-muted-foreground">
                      {t("billing.activeUntil", {
                        date: new Date(
                          billingCatalog.entitlements.active_until,
                        ).toLocaleDateString(),
                      })}
                      {!billingCatalog.entitlements.auto_renew && ` · ${t("billing.autoRenewOff")}`}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("billing.paymentGateway")}</span>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as "midtrans" | "doku")}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground"
                    >
                      <option value="midtrans">Midtrans</option>
                      <option value="doku">DOKU</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("billing.channel")}</span>
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground"
                    >
                      <option value="qris">QRIS</option>
                      <option value="va">Virtual Account</option>
                      <option value="card">Card</option>
                    </select>
                  </label>
                  {billingCatalog.entitlements.auto_renew && (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => void handleCancelRenewal()}
                      className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {t("billing.cancelAutoRenew")}
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </header>

        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-300">
            <Check className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeOrder && activeOrder.status === "PENDING" && (
          <PendingOrderBanner
            order={activeOrder}
            busy={busyAction === `poll_${activeOrder.order_code}`}
            onCheckStatus={(code) => void handleCheckOrderStatus(code)}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>{t("billing.loading")}</span>
          </div>
        ) : (
          <>
            {billingCatalog && (
              <>
                <QuickPassesSection
                  passes={billingCatalog.passes}
                  busyAction={busyAction}
                  onCheckout={(pass) =>
                    void handleCheckout({
                      item_type: "subscription",
                      item_code: pass.tier_code,
                      billing_period: pass.billing_period,
                      key: `pass_${pass.plan_key}`,
                    })
                  }
                />

                <SubscriptionPlansSection
                  plans={billingCatalog.plans}
                  selectedPeriod={selectedPeriod}
                  onSelectPeriod={setSelectedPeriod}
                  busyAction={busyAction}
                  onSubscribe={(tierCode, opt) =>
                    void handleCheckout({
                      item_type: "subscription",
                      item_code: tierCode,
                      billing_period: opt.billing_period,
                      key: `plan_${tierCode}_${opt.billing_period}`,
                    })
                  }
                />

                <ClubBoostSection
                  options={billingCatalog.club_boost.options}
                  levels={billingCatalog.club_boost.levels}
                  myClubs={myClubs}
                  selectedClubId={selectedBoostClubId}
                  onSelectClub={setSelectedBoostClubId}
                  busyAction={busyAction}
                  onBoost={(opt) =>
                    void handleCheckout({
                      item_type: "club_boost",
                      item_code: opt.tier_code,
                      billing_period: opt.billing_period,
                      target_community_id: selectedBoostClubId,
                      key: `boost_${opt.plan_key}`,
                    })
                  }
                />
              </>
            )}

            <CosmeticsShopSection
              cosmetics={cosmetics}
              userAvatarUrl={user?.avatar_url}
              userDisplayName={user?.display_name || user?.username || "Rider"}
              busyAction={busyAction}
              onEquipFrame={(code) => void handleEquipFrame(code)}
              onBuyFrame={(code) =>
                void handleCheckout({
                  item_type: "cosmetic_frame",
                  item_code: code,
                  key: `buy_frame_${code}`,
                })
              }
              onToggleBadge={(code) => void toggleEquipBadge(code)}
              onBuyBadge={(code) =>
                void handleCheckout({
                  item_type: "cosmetic_badge",
                  item_code: code,
                  key: `buy_badge_${code}`,
                })
              }
            />

            {isAuthenticated && (
              <AccountDeletionCard
                busy={busyAction === "delete_account"}
                onSubmit={handleRequestDeletion}
              />
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
