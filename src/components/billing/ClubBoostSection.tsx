import { Flame, Loader2, Minus, Plus } from "lucide-react";
import { formatDbPrice, type ClubBoostLevelInfo, type PlanPriceOption } from "@/lib/api-billing";
import { useI18n } from "@/lib/i18n";

interface ClubBoostSectionProps {
  options: PlanPriceOption[];
  levels: ClubBoostLevelInfo[];
  quantity: number;
  onQuantityChange: (qty: number) => void;
  itemOnlyEligible?: boolean | undefined;
  itemAddonMonthly?: PlanPriceOption | null | undefined;
  itemAddonYearly?: PlanPriceOption | null | undefined;
  busyAction: string | null;
  onBoost: (option: PlanPriceOption) => void;
}

export function ClubBoostSection({
  options,
  levels,
  quantity,
  onQuantityChange,
  itemOnlyEligible = false,
  itemAddonMonthly,
  itemAddonYearly,
  busyAction,
  onBoost,
}: ClubBoostSectionProps) {
  const { t } = useI18n();
  if (options.length === 0) return null;

  const qty = Math.min(10, Math.max(1, quantity));

  const isYearlyOption = (opt: PlanPriceOption) => {
    const p = opt.billing_period.trim().toLowerCase();
    return p === "yearly" || p === "annual" || opt.plan_key.includes("yearly");
  };

  const computeTotal = (opt: PlanPriceOption) => {
    const yearly = isYearlyOption(opt);
    if (!yearly && itemOnlyEligible && itemAddonMonthly) {
      return {
        currency: itemAddonMonthly.currency,
        amount: itemAddonMonthly.amount * qty,
        isItemOnly: true,
        yearly,
      };
    }
    const addonUnit = yearly
      ? (itemAddonYearly?.amount ?? opt.amount)
      : (itemAddonMonthly?.amount ?? opt.amount);
    return {
      currency: opt.currency,
      amount: opt.amount + (qty - 1) * addonUnit,
      isItemOnly: false,
      yearly,
    };
  };

  return (
    <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-display text-xl font-black">
            <Flame className="size-5 text-primary" />
            {t("billing.clubBoostTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("billing.clubBoostSubtitle")}</p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 px-3 py-2">
          <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
            {t("billing.boostQuantityLabel")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={Boolean(busyAction) || qty <= 1}
              onClick={() => onQuantityChange(Math.max(1, qty - 1))}
              className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40"
              aria-label={t("common.decrease")}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-7 text-center font-display text-sm font-black">{qty}</span>
            <button
              type="button"
              disabled={Boolean(busyAction) || qty >= 10}
              onClick={() => onQuantityChange(Math.min(10, qty + 1))}
              className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40"
              aria-label={t("common.increase")}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {options.map((opt) => {
          const key = `boost_${opt.plan_key}`;
          const busy = busyAction === key;
          const pricing = computeTotal(opt);
          return (
            <div
              key={opt.plan_key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-4"
            >
              <div className="space-y-1">
                <div className="font-display text-base font-black">
                  {pricing.isItemOnly ? t("billing.boosterItemsOnlyTitle", { qty }) : opt.label}
                </div>
                <div className="font-display text-lg font-black text-primary">
                  {formatDbPrice(pricing.currency, pricing.amount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pricing.isItemOnly
                    ? t("billing.boosterItemsOnlyHint", { qty })
                    : pricing.yearly
                      ? t("billing.annualBoostHint", { qty })
                      : t("billing.monthlyBoostHint", { qty })}
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => onBoost(opt)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-display text-xs font-bold uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                {t("billing.boostNow")}
              </button>
            </div>
          );
        })}
      </div>

      {levels.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="font-mono text-xs font-bold uppercase text-muted-foreground">
            {t("billing.boostLevelsHeading")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map((lvl) => (
              <div
                key={lvl.boost_level}
                className="rounded-xl border border-border bg-background/60 p-3 text-xs"
              >
                <div className="font-bold text-foreground">
                  Lv.{lvl.boost_level} · {lvl.level_name} ({lvl.required_boosts}+)
                </div>
                <div className="mt-1 text-muted-foreground">
                  {t("billing.boostLevelMeta", {
                    members: lvl.member_limit.toLocaleString(),
                    voice: lvl.max_voice_channels,
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
