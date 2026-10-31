import { Link } from "@tanstack/react-router";
import { Wordmark } from "./wordmark";

const navLinkClass =
  "font-mono text-sm uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="REVV- Web home" className="transition-opacity hover:opacity-80">
            <Wordmark className="text-2xl" />
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary sm:inline-flex">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Closed Beta
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/news" className={navLinkClass} activeProps={{ className: "text-foreground" }}>
            News
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark className="text-4xl" />
          <p className="eyebrow mt-3">Friendly Neighborhood Riding Companion</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex gap-5">
            <Link to="/" className={navLinkClass}>
              Home
            </Link>
            <Link to="/news" className={navLinkClass}>
              News
            </Link>
            <Link to="/login" className={navLinkClass}>
              Sign in
            </Link>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/75">
            © 2026 REVV- Web · revv.asteralabs.digital
          </p>
        </div>
      </div>
    </footer>
  );
}
