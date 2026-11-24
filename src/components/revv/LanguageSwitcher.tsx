import { Globe } from "lucide-react";
import { SUPPORTED_WEB_LOCALES, useI18n, type WebLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2 py-1 text-xs text-foreground",
        className,
      )}
    >
      <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{t("nav.language")}</span>
      <select
        aria-label={t("nav.language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as WebLocale)}
        className="cursor-pointer bg-transparent font-mono text-xs font-semibold uppercase text-foreground outline-none"
      >
        {SUPPORTED_WEB_LOCALES.map((item) => (
          <option key={item.code} value={item.code} className="bg-card text-foreground">
            {compact ? item.shortLabel : `${item.shortLabel} · ${item.nativeLabel}`}
          </option>
        ))}
      </select>
    </label>
  );
}
