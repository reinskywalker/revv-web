import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Tailwind max-width class, e.g. "max-w-md", "max-w-lg", "max-w-2xl", "max-w-4xl". */
  maxWidthClass?: string;
  /** Extra classes on the dialog panel container. */
  panelClassName?: string;
  /** Extra classes on the backdrop overlay. */
  backdropClassName?: string;
  /** Whether clicking outside the panel closes the modal (default: true). */
  closeOnBackdrop?: boolean;
  /** Accessible label when no visible title is provided. */
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Shared accessible modal overlay with Escape-key dismissal and backdrop handling.
 */
export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-md",
  panelClassName,
  backdropClassName,
  closeOnBackdrop = true,
  ariaLabel,
  children,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm",
        backdropClassName,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        className={cn(
          "w-full rounded-2xl border border-border bg-card shadow-2xl",
          maxWidthClass,
          panelClassName ?? "p-6",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {title !== undefined && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {typeof title === "string" ? (
                <h3 className="font-display text-base font-bold text-foreground truncate">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
