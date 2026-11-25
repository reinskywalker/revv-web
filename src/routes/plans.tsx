import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Flame, Loader2, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { AccountDeletionCard } from "@/components/billing/AccountDeletionCard";
import { CosmeticsShopSection } from "@/components/billing/CosmeticsShopSection";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/api";
import {
  cancelMySubscription,
  equipMyAvatarFrame,
  equipMyCosmeticBadges,
  fetchSubscriptionPlansCatalog,
  formatDbPrice,
  requestAccountDeletion,
  type SubscriptionPlansCatalogResponse,
} from "@/lib/api-billing";
import { useAuth } from "@/lib/auth-context";
import {
  type CosmeticsCatalogResponse,
  fetchCosmeticsCatalogCached,
  invalidateCosmeticsCatalogCache,
} from "@/lib/cosmetics-cache";
import { useI18n } from "@/lib/i18n";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Wardrobe — REVV" },
      {
        name: "description",
        content:
          "View REVV local plans, Paddock Club Boost perks, and equip unlocked cosmetics. Purchases are handled in REVV Mobile App.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const userCountry = user?.country ?? null;
  const prevCountryRef = useRef<string | null>(userCountry);

  const [billingCatalog, setBillingCatalog] = useState<SubscriptionPlansCatalogResponse | null>(
    null,
  );
  const [cosmetics, setCosmetics] = useState<CosmeticsCatalogResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cosPromise = fetchCosmeticsCatalogCached(true);
      if (isAuthenticated) {
        const [plansRes, cosRes] = await Promise.all([fetchSubscriptionPlansCatalog(), cosPromise]);
        setBillingCatalog(plansRes);
        setCosmetics(cosRes);
      } else {
        setCosmetics(await cosPromise);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not load pricing catalog."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (prevCountryRef.current !== userCountry) {
      prevCountryRef.current = userCountry;
      invalidateCosmeticsCatalogCache();
    }
    void loadData();
  }, [loadData, userCountry]);

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
      setError(getErrorMessage(err, "Could not cancel renewal."));
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
      invalidateCosmeticsCatalogCache();
      setNotice(t("billing.badgesUpdated"));
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update equipped badges."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleEquipFrame = async (frameCode: string | null) => {
    setBusyAction(`equip_frame_${frameCode ?? "none"}`);
    try {
      await equipMyAvatarFrame(frameCode);
      invalidateCosmeticsCatalogCache();
      setNotice(t("billing.frameUpdated"));
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update avatar frame."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestDeletion = async (reason: string): Promise<boolean> => {
    setBusyAction("delete_account");
    setError(null);
    try {
      await requestAccountDeletion(reason.trim() || undefined);
      setNotice(t("billing.deletionSubmitted"));
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit deletion request."));
      return false;
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
        <header className="space-y-4">
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

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Smartphone className="size-4" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">
                  {t("billing.mobileOnlyTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">{t("billing.mobileOnlySubtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                Google Play
              </a>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-primary/40"
              >
                App Store
              </a>
            </div>
          </div>

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

                {billingCatalog.entitlements.auto_renew && (
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => setConfirmCancelOpen(true)}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {t("billing.cancelAutoRenew")}
                  </button>
                )}
              </div>
            )
          )}
        </header>

        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
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

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>{t("billing.loading")}</span>
          </div>
        ) : (
          <>
            {billingCatalog && (
              <>
                {billingCatalog.passes.length > 0 && (
                  <section className="space-y-3">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-lg font-black">
                        <Zap className="size-4 text-primary" />
                        {t("billing.quickPassesTitle")}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t("billing.quickPassesSubtitle")}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {billingCatalog.passes.map((pass) => (
                        <div
                          key={pass.plan_key}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-display text-base font-black">{pass.label}</h3>
                              <p className="text-xs text-muted-foreground">{pass.tagline}</p>
                            </div>
                            <span className="shrink-0 font-display text-lg font-black text-primary">
                              {formatDbPrice(pass.currency, pass.amount)}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {t("billing.mobileOnlyShort")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-black">{t("billing.plansTitle")}</h2>
                    <div className="inline-flex rounded-xl border border-border bg-card p-1">
                      {(["weekly", "monthly", "yearly"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setSelectedPeriod(period)}
                          className={
                            selectedPeriod === period
                              ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
                              : "rounded-lg px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                          }
                        >
                          {t(
                            `billing.period${period.charAt(0).toUpperCase()}${period.slice(1)}` as
                              | "billing.periodWeekly"
                              | "billing.periodMonthly"
                              | "billing.periodYearly",
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {billingCatalog.plans.map((tier) => {
                      const opt =
                        tier.options.find((o) => o.billing_period === selectedPeriod) ??
                        tier.options[0];
                      const isCurrent =
                        billingCatalog.entitlements.tier_code.toLowerCase() ===
                        tier.tier_code.toLowerCase();
                      const perks = [
                        tier.limits.radar_radius_km != null
                          ? `${tier.limits.radar_radius_km} km live radar`
                          : null,
                        tier.limits.hosted_voice_riders != null
                          ? `Up to ${tier.limits.hosted_voice_riders} convoy voice riders`
                          : null,
                        tier.limits.garage_bikes != null
                          ? `${tier.limits.garage_bikes} garage bikes`
                          : null,
                        tier.limits.saved_routes != null
                          ? `${tier.limits.saved_routes} saved routes`
                          : null,
                        tier.limits.has_google_traffic_nav ? "Live traffic navigation" : null,
                      ].filter((p): p is string => Boolean(p));

                      return (
                        <div
                          key={tier.tier_code}
                          className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold uppercase text-primary">
                                {tier.name}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {t("billing.subscribed")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                            <div className="font-display text-xl font-black">
                              {opt
                                ? formatDbPrice(opt.currency, opt.amount)
                                : t("billing.freeForever")}
                            </div>
                            <ul className="space-y-1.5 pt-2 text-xs text-muted-foreground">
                              {perks.map((perk) => (
                                <li key={perk} className="flex items-start gap-2">
                                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                                  <span>{perk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {t("billing.mobileOnlyShort")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {billingCatalog.club_boost.levels.length > 0 && (
                  <section className="space-y-3 rounded-2xl border border-primary/30 bg-card p-6">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-lg font-black">
                        <Flame className="size-4 text-primary" />
                        {t("billing.clubBoostTitle")}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t("billing.clubBoostSubtitle")}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {billingCatalog.club_boost.levels.map((lvl) => (
                        <div
                          key={lvl.boost_level}
                          className="rounded-xl border border-border bg-secondary/40 p-3.5"
                        >
                          <div className="font-display text-sm font-black text-foreground">
                            {lvl.level_name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("billing.boostLevelMeta", {
                              members: lvl.member_limit,
                              voice: lvl.max_voice_channels,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            <CosmeticsShopSection
              cosmetics={cosmetics}
              userAvatarUrl={user?.avatar_url}
              userDisplayName={user?.name || user?.first_name || user?.username || "Rider"}
              busyAction={busyAction}
              onEquipFrame={(code) => void handleEquipFrame(code)}
              onToggleBadge={(code) => void toggleEquipBadge(code)}
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
      <ConfirmDialog
        open={confirmCancelOpen}
        title={t("billing.cancelAutoRenew")}
        message="Auto-renewal will pause immediately. Your current paid benefits remain active until the end of the billing cycle."
        confirmLabel={t("billing.cancelAutoRenew")}
        destructive
        busy={busyAction === "cancel_sub"}
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          setConfirmCancelOpen(false);
          void handleCancelRenewal();
        }}
      />
    </div>
  );
}
