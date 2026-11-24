import { Crown, Loader2 } from "lucide-react";
import { formatDbPrice, type PlanPriceOption, type SubscriptionPlanGroup } from "@/lib/api-billing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SubscriptionPlansSectionProps {
  plans: SubscriptionPlanGroup[];
  selectedPeriod: "weekly" | "monthly" | "yearly";
  onSelectPeriod: (period: "weekly" | "monthly" | "yearly") => void;
  busyAction: string | null;
  onSubscribe: (tierCode: string, option: PlanPriceOption) => void;
}

export function SubscriptionPlansSection({
  plans,
  selectedPeriod,
  onSelectPeriod,
  busyAction,
  onSubscribe,
}: SubscriptionPlansSectionProps) {
  const { t } = useI18n();

  const periods: Array<{ id: "weekly" | "monthly" | "yearly"; label: string }> = [
    { id: "weekly", label: t("billing.periodWeekly") },
    { id: "monthly", label: t("billing.periodMonthly") },
    { id: "yearly", label: t("billing.periodYearly") },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Crown className="size-5 text-primary" />
          {t("billing.plansTitle")}
        </h2>
        <div className="inline-flex rounded-xl border border-border bg-secondary p-1">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPeriod(p.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase transition",
                selectedPeriod === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((group) => {
          const activeOption =
            group.options.find((o) => o.billing_period === selectedPeriod) ?? group.options[0];
          const key = `plan_${group.tier_code}_${activeOption?.billing_period ?? "free"}`;
          const busy = busyAction === key;

          return (
            <div
              key={group.tier_code}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="space-y-2">
                <h3 className="font-display text-lg font-black">{group.name}</h3>
                <div className="font-display text-2xl font-black text-primary">
                  {group.is_paid && activeOption
                    ? formatDbPrice(activeOption.currency, activeOption.amount)
                    : t("billing.freeForever")}
                </div>
                <p className="text-xs text-muted-foreground">{group.tagline}</p>
              </div>
              {group.is_paid && activeOption && (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => onSubscribe(group.tier_code, activeOption)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-bold uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-3.5 animate-spin" />}
                  {t("billing.subscribe")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
