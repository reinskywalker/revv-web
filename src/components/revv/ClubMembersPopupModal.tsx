import { Link } from "@tanstack/react-router";
import { Flame, Shield, Users, X } from "lucide-react";
import { RevvAvatar, VerifiedCheckBadge } from "@/components/revv/RevvAvatar";
import type { CommunityMemberItem, CommunitySummary } from "@/lib/api-rider";
import { useI18n } from "@/lib/i18n";

interface ClubMembersPopupModalProps {
  open: boolean;
  onClose: () => void;
  community: CommunitySummary;
  members: CommunityMemberItem[];
}

export function ClubMembersPopupModal({
  open,
  onClose,
  community,
  members,
}: ClubMembersPopupModalProps) {
  const { t } = useI18n();
  if (!open) return null;

  const approvedMembers = members.filter((m) =>
    ["approved", "active"].includes((m.status || "").trim().toLowerCase()),
  );
  const memberLimit = community.member_limit ?? 30;
  const count = community.member_count ?? approvedMembers.length;
  const pct = Math.min(100, Math.round((count / Math.max(1, memberLimit)) * 100));
  const nearCapacity = !community.is_official && pct >= 80;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${community.name} ${t("clubCap.rosterTitle")}`}
    >
      <div className="relative flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Users className="size-5 text-primary" />
            <div>
              <h3 className="font-display text-lg font-black">{t("clubCap.rosterTitle")}</h3>
              <p className="font-mono text-xs text-muted-foreground">
                {t("clubCap.membersCount", { count, limit: memberLimit.toLocaleString() })}
                {community.boost_count
                  ? ` · ${t("clubCap.boostsSuffix", { count: community.boost_count })}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("clubCap.closeAria")}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {!community.is_official && (
          <div className="space-y-2.5 border-b border-border/70 bg-secondary/30 px-5 py-3.5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className={nearCapacity ? "font-bold text-warning" : "text-muted-foreground"}>
                {count >= memberLimit
                  ? t("clubCap.fullSoftFreeze")
                  : nearCapacity
                    ? t("clubCap.approachingCap")
                    : t("clubCap.capacityLabel")}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                className={
                  count >= memberLimit
                    ? "h-full bg-destructive transition-all"
                    : nearCapacity
                      ? "h-full bg-warning transition-all"
                      : "h-full bg-primary transition-all"
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">{t("clubCap.boostPitch")}</p>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 font-display text-xs font-bold uppercase text-primary">
                <Flame className="size-3.5" />
                {t("clubCap.boostCta")}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 divide-y divide-border/50 overflow-y-auto px-5 py-2">
          {approvedMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("clubCap.emptyMembers")}
            </p>
          ) : (
            approvedMembers.map((m) => (
              <Link
                key={m.user_id}
                to="/id/$username"
                params={{ username: m.username }}
                onClick={onClose}
                className="flex items-center justify-between gap-3 py-3 transition hover:opacity-85"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <RevvAvatar
                    src={m.avatar_url}
                    name={m.display_name || m.username}
                    frameCode={m.equipped_frame_code}
                    showVerifiedBadge={m.is_verified_profile}
                    size={38}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                      <span className="truncate">{m.display_name}</span>
                      {m.is_verified_profile && <VerifiedCheckBadge size={14} />}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      @{m.username}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                  {["Founder", "Administrator"].includes(m.role) && (
                    <Shield className="size-3 text-primary" />
                  )}
                  {m.role}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
