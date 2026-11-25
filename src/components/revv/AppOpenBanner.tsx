import { useEffect, useState } from "react";
import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/api";

interface AppOpenBannerProps {
  deepLinkPath: string;
  title?: string;
  subtitle?: string;
  onContinueInBrowser?: () => void;
}

const DISMISS_SESSION_KEY = "revv_mobile_app_banner_dismissed";

function isMobileBrowserEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  const isSmallViewport =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 767px)").matches
      : window.innerWidth < 768;
  return isMobileUa || isSmallViewport;
}

/**
 * Compact mobile-only prompt offering native app launch.
 * Never renders on desktop viewports so desktop layouts stay distraction-free.
 */
export function AppOpenBanner({
  deepLinkPath,
  title = "Open in REVV App",
  subtitle = "Live push notifications & ride sync.",
  onContinueInBrowser,
}: AppOpenBannerProps) {
  const [eligibleMobile, setEligibleMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [triedAppLaunch, setTriedAppLaunch] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_SESSION_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore storage errors
    }

    const update = () => setEligibleMobile(isMobileBrowserEnvironment());
    update();

    if (typeof window.matchMedia === "function") {
      const mql = window.matchMedia("(max-width: 767px)");
      mql.addEventListener?.("change", update);
      return () => mql.removeEventListener?.("change", update);
    }
    return undefined;
  }, []);

  if (!eligibleMobile || dismissed) return null;

  const cleanPath = deepLinkPath.replace(/^\/+/, "");
  const deepLinkUrl = `revv://${cleanPath}`;
  const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const storeUrl = isIos ? APP_STORE_URL : PLAY_STORE_URL;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    } catch {
      // ignore
    }
    onContinueInBrowser?.();
  };

  return (
    <div className="mb-4 rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Smartphone className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <a
          href={deepLinkUrl}
          onClick={() => setTriedAppLaunch(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs"
        >
          <ExternalLink className="size-3.5" />
          Open
        </a>
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={isIos ? "Download on App Store" : "Get it on Google Play"}
          title={isIos ? "App Store" : "Google Play"}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:border-primary/40"
        >
          <Download className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {triedAppLaunch && (
        <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-300">
          App didn't open? Tap the download icon to install REVV or continue in browser.
        </p>
      )}
    </div>
  );
}
