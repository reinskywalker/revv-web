import { Flame, Loader2 } from "lucide-react";
import { formatDbPrice, type ClubBoostLevelDto, type PlanPriceOption } from "@/lib/api-billing";
import type { CommunitySummary } from "@/lib/api-rider";
import { useI18n } from "@/lib/i18n";

interface ClubBoostSectionProps {
  options: PlanPriceOption[];
  levels: ClubBoostLevelDto[];
  myClubs: CommunitySummary[];
  selectedClubId: string;
  onSelectClub: (clubId: string) => void;
  busyAction: string | null;
  onBoost: (option: PlanPriceOption) => void;
}

export function ClubBoostSection({
  options,
  levels,
  myClubs,
  selectedClubId,
  onSelectClub,
  busyAction,
  onBoost,
}: ClubBoostSectionProps) {
  const { t } = useI18n();
  if (options.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Flame className="size-5 text-primary" />
          {t("billing.clubBoostTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("billing.clubBoostSubtitle")}</p>
      </div>

      {myClubs.length > 0 ? (
        <div className="max-w-md space-y-1.5">
          <label className="font-mono text-xs font-bold uppercase text-muted-foreground">
            {t("billing.selectClubLabel")}
          </label>
          <select
            value={selectedClubId}
            onChange={(e) => onSelectClub(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {myClubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.member_count}/{club.member_limit ?? 30})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("billing.noClubsJoined")}</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {options.map((opt) => {
          const key = `boost_${opt.plan_key}`;
          const busy = busyAction === key;
          return (
            <div
              key={opt.plan_key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-4"
            >
              <div>
                <div className="font-display text-base font-black">{opt.label}</div>
                <div className="font-display text-lg font-black text-primary">
                  {formatDbPrice(opt.currency, opt.amount)}
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(busyAction) || !selectedClubId}
                onClick={() => onBoost(opt)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-display text-xs font-bold uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
