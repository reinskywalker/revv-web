import { Loader2, Sparkles } from "lucide-react";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import { RevvBadge } from "@/components/revv/RevvBadge";
import { formatDbPrice } from "@/lib/api-billing";
import type { CosmeticsCatalogResponse } from "@/lib/cosmetics-cache";
import { useI18n } from "@/lib/i18n";

interface CosmeticsShopSectionProps {
  cosmetics: CosmeticsCatalogResponse | null;
  userAvatarUrl?: string | null;
  userDisplayName: string;
  busyAction: string | null;
  onEquipFrame: (frameCode: string | null) => void;
  onBuyFrame: (frameCode: string) => void;
  onToggleBadge: (badgeCode: string) => void;
  onBuyBadge: (badgeCode: string) => void;
}

export function CosmeticsShopSection({
  cosmetics,
  userAvatarUrl,
  userDisplayName,
  busyAction,
  onEquipFrame,
  onBuyFrame,
  onToggleBadge,
  onBuyBadge,
}: CosmeticsShopSectionProps) {
  const { t } = useI18n();
  if (!cosmetics) return null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Sparkles className="size-5 text-primary" />
          {t("billing.cosmeticsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("billing.cosmeticsSubtitle")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("billing.framesHeading")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cosmetics.frames.map((frame) => {
            const canBuy =
              !frame.unlocked &&
              (frame.source_type === "purchase" || frame.source_type === "shop") &&
              frame.effective_amount > 0;
            const busy =
              busyAction === `equip_frame_${frame.code}` ||
              busyAction === `buy_frame_${frame.code}`;

            return (
              <div
                key={frame.code}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <RevvAvatar
                  src={userAvatarUrl}
                  name={userDisplayName}
                  frameCode={frame.code}
                  size={56}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="truncate font-display text-sm font-black">{frame.title}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{frame.description}</p>
                  {frame.bundled_badge_code && (
                    <span className="inline-block rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {t("billing.includesBadgePill", {
                        badge: frame.bundled_badge_title ?? frame.bundled_badge_code,
                      })}
                    </span>
                  )}
                  {frame.unlocked ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => onEquipFrame(frame.equipped ? null : frame.code)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1 text-xs font-bold hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {busy && <Loader2 className="size-3 animate-spin" />}
                      {frame.equipped ? t("billing.unequip") : t("billing.equip")}
                    </button>
                  ) : canBuy ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => onBuyFrame(frame.code)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {t("billing.buyNow", {
                        price: formatDbPrice(frame.effective_currency, frame.effective_amount),
                      })}
                    </button>
                  ) : (
                    <span className="inline-block font-mono text-[11px] text-muted-foreground">
                      {t("billing.freeTrack")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("billing.badgesHeading")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cosmetics.badges.map((badge) => {
            const canBuy =
              !badge.unlocked &&
              (badge.source_type === "purchase" || badge.source_type === "shop") &&
              badge.effective_amount > 0;
            return (
              <div
                key={badge.code}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <RevvBadge badgeCode={badge.code} title={badge.title} size={46} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="truncate font-display text-sm font-black">{badge.title}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{badge.description}</p>
                  {badge.unlocked ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => onToggleBadge(badge.code)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1 text-xs font-bold hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {badge.equipped ? t("billing.equipped") : t("billing.equip")}
                    </button>
                  ) : canBuy ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => onBuyBadge(badge.code)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {t("billing.buyNow", {
                        price: formatDbPrice(badge.effective_currency, badge.effective_amount),
                      })}
                    </button>
                  ) : (
                    <span className="inline-block font-mono text-[11px] text-muted-foreground">
                      {t("billing.freeTrack")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
