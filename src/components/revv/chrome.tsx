import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Wordmark } from "./wordmark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";

const navLinkClass =
  "text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap";

export function SiteHeader() {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="REVV- Web home" className="transition-opacity hover:opacity-80">
            <Wordmark className="text-2xl" />
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary lg:inline-flex">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            {t("nav.closedBeta")}
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5">
          <Link to="/" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            {t("nav.home")}
          </Link>
          <Link
            to="/leaderboard"
            className={navLinkClass}
            activeProps={{ className: "text-foreground" }}
          >
            {t("nav.leaderboard")}
          </Link>
          <Link to="/clubs" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            {t("nav.clubs")}
          </Link>
          <Link to="/news" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            {t("nav.news")}
          </Link>
          <Link to="/plans" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            {t("nav.plans")}
          </Link>
          <Link
            to="/register"
            className={navLinkClass}
            activeProps={{ className: "text-foreground" }}
          >
            {t("nav.joinBeta")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-foreground transition hover:bg-secondary"
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>

          <Link
            to="/login"
            className="rounded-xl bg-primary px-3.5 py-2 font-display text-xs sm:text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 whitespace-nowrap"
          >
            {t("nav.signIn")}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-foreground md:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div className="border-t border-border bg-card px-4 py-4 shadow-xl md:hidden">
          <nav className="flex flex-col gap-2">
            {[
              { to: "/", label: t("nav.home") },
              { to: "/leaderboard", label: t("nav.leaderboard") },
              { to: "/clubs", label: t("nav.clubs") },
              { to: "/news", label: t("nav.news") },
              { to: "/plans", label: t("nav.plans") },
              { to: "/register", label: t("nav.joinBeta") },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 sm:hidden">
            <span className="text-xs font-medium text-muted-foreground">Language</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border/80 bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark className="text-4xl" />
          <p className="eyebrow mt-3">Friendly Neighborhood Riding Companion</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/" className={navLinkClass}>
              {t("nav.home")}
            </Link>
            <Link to="/leaderboard" className={navLinkClass}>
              {t("nav.leaderboard")}
            </Link>
            <Link to="/clubs" className={navLinkClass}>
              {t("nav.clubs")}
            </Link>
            <Link to="/news" className={navLinkClass}>
              {t("nav.news")}
            </Link>
            <Link to="/plans" className={navLinkClass}>
              {t("nav.plans")}
            </Link>
            <Link to="/register" className={navLinkClass}>
              {t("nav.joinBeta")}
            </Link>
            <Link to="/privacy" className={navLinkClass}>
              {t("nav.privacy")}
            </Link>
            <Link to="/login" className={navLinkClass}>
              {t("nav.signIn")}
            </Link>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            © 2026 REVV- Web · revv.asteralabs.digital
          </p>
        </div>
      </div>
    </footer>
  );
}
