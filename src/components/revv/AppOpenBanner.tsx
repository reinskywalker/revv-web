import { useState } from "react";
import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/api";

interface AppOpenBannerProps {
  deepLinkPath: string;
  title?: string;
  subtitle?: string;
  onContinueInBrowser?: () => void;
}

/**
 * Reusable banner giving web visitors an explicit choice to open the link
 * in the native REVV mobile app, continue in the browser, or install the app.
 */
export function AppOpenBanner({
  deepLinkPath,
  title = "Open this in the REVV mobile app",
  subtitle = "Get turn-by-turn navigation, live voice sessions, and instant push updates.",
  onContinueInBrowser,
}: AppOpenBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [triedAppLaunch, setTriedAppLaunch] = useState(false);

  if (dismissed) return null;

  const cleanPath = deepLinkPath.replace(/^\/+/, "");
  const deepLinkUrl = `revv://${cleanPath}`;

  const handleContinue = () => {
    setDismissed(true);
    onContinueInBrowser?.();
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/25 bg-card/90 p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            {triedAppLaunch && (
              <p className="mt-2 text-xs font-medium text-amber-300">
                App did not open automatically? Install REVV from Google Play or the App Store
                below, or stay right here in your browser.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={deepLinkUrl}
            onClick={() => setTriedAppLaunch(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            Open in REVV App
          </a>

          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-secondary/70 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            Continue in Browser
          </button>

          <div className="flex items-center gap-2">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground/90 transition hover:border-primary/40 hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              Google Play
            </a>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground/90 transition hover:border-primary/40 hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              App Store
            </a>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            aria-label="Dismiss banner"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
