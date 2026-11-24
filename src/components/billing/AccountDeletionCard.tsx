import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface AccountDeletionCardProps {
  busy: boolean;
  onSubmit: (reason: string) => Promise<void>;
}

export function AccountDeletionCard({ busy, onSubmit }: AccountDeletionCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    await onSubmit(reason);
    setReason("");
    setExpanded(false);
  };

  return (
    <section className="rounded-2xl border border-destructive/30 bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 font-display text-base font-black text-destructive">
            <Trash2 className="size-4" />
            {t("billing.deletionTitle")}
          </h3>
          <p className="max-w-2xl text-xs text-muted-foreground">{t("billing.deletionSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
        >
          {t("billing.deletionToggle")}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("billing.deletionReasonPlaceholder")}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-bold uppercase text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {t("billing.deletionSubmit")}
          </button>
        </div>
      )}
    </section>
  );
}
