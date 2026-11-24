import { Clock, Loader2, RefreshCw, X } from "lucide-react";
import { formatDbPrice, type PaymentOrderDto } from "@/lib/api-billing";
import { useI18n } from "@/lib/i18n";

interface PendingOrderBannerProps {
  order: PaymentOrderDto;
  busy: boolean;
  onCheckStatus: (orderCode: string) => void;
  onCancelOrder?: (orderCode: string) => void;
}

export function PendingOrderBanner({
  order,
  busy,
  onCheckStatus,
  onCancelOrder,
}: PendingOrderBannerProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
      <div className="flex items-start gap-2.5">
        <Clock className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-foreground">
            {t("billing.pendingTitle", { code: order.order_code })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("billing.pendingBody", {
              amount: formatDbPrice(order.currency, order.expected_amount),
              time: new Date(order.expires_at).toLocaleTimeString(),
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onCheckStatus(order.order_code)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {t("billing.checkStatus")}
        </button>
        {onCancelOrder && (
          <button
            type="button"
            disabled={busy}
            aria-label={t("billing.cancelOrder")}
            onClick={() => onCancelOrder(order.order_code)}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
