import { Loader2, Zap } from "lucide-react";
import {
  formatDbPrice,
  getBillingTierRank,
  type PlanPriceOption,
  type UserEntitlementsDto,
} from "@/lib/api-billing";
import { useI18n } from "@/lib/i18n";

interface QuickPassesSectionProps {
  passes: PlanPriceOption[];
  entitlements?: UserEntitlementsDto | null;
  busyAction: string | null;
  onCheckout: (pass: PlanPriceOption) => void;
}

export function QuickPassesSection({
  passes,
  entitlements,
  busyAction,
  onCheckout,
}: QuickPassesSectionProps) {
  const { t } = useI18n();
  if (passes.length === 0) return null;

  const coveredByPaidTier =
    Boolean(entitlements?.is_paid) && getBillingTierRank(entitlements?.tier_code) > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Zap className="size-5 text-warning" />
          {t("billing.quickPassesTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("billing.quickPassesSubtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {passes.map((pass) => {
          const key = `pass_${pass.plan_key}`;
          const busy = busyAction === key;
          return (
            <div
              key={pass.plan_key}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-black">{pass.brand_name}</h3>
                  <span className="font-display text-xl font-black text-primary">
                    {formatDbPrice(pass.currency, pass.amount)}
                  </span>
                </div>
                <p className="font-mono text-xs uppercase text-muted-foreground">{pass.label}</p>
                <p className="text-sm text-muted-foreground">{pass.tagline}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(busyAction) || coveredByPaidTier}
                onClick={() => onCheckout(pass)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                {coveredByPaidTier ? t("billing.includedInPlan") : t("billing.activatePass")}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
