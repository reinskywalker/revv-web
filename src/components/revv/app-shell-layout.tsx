import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  User,
  Wrench,
  X,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Wordmark } from "./wordmark";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface AppShellLayoutProps {
  children: ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // The left navigation sidebar is ONLY visible when the user is logged in.
  // When logged out, render in standard full-screen public layout.
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground antialiased">{children}</div>;
  }

  const isAdministrator =
    user?.role?.toLowerCase() === "administrator" ||
    user?.role?.toLowerCase() === "moderator";

  const myProfilePath = user?.username ? `/id/${encodeURIComponent(user.username)}` : "/login";

  const navItems = [
    {
      label: "Home",
      to: "/",
      icon: Home,
      exact: true,
    },
    {
      label: "News",
      to: "/news",
      icon: FileText,
    },
    {
      label: "Rider Feed",
      to: "/feed",
      icon: MessageSquare,
    },
    {
      label: "Digital Garage",
      to: "/garage",
      icon: Wrench,
    },
    {
      label: "My Profile",
      to: myProfilePath,
      icon: User,
    },
    ...(isAdministrator
      ? [
          {
            label: "Admin Console",
            to: "/admin",
            icon: LayoutDashboard,
          },
        ]
      : []),
  ];

  const currentPath = location.pathname;
  const isDashboardPage =
    currentPath.startsWith("/id") ||
    currentPath === "/garage" ||
    currentPath === "/admin";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
            className="rounded-lg border border-border bg-secondary/50 p-2 text-foreground transition hover:bg-secondary"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-center">
            <Wordmark className="text-xl" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <Link
              to={myProfilePath}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-secondary/40 px-2.5 py-1 text-xs font-mono"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                {user.username?.charAt(0).toUpperCase() || "R"}
              </div>
              <span className="max-w-[90px] truncate font-medium">@{user.username}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground transition hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Backdrop & Off-Canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[80vw] flex-col border-r border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <Link to="/" onClick={() => setMobileOpen(false)}>
                <Wordmark className="text-2xl" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="mt-5 flex-1 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? currentPath === item.to
                  : currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition-colors",
                      active
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer Session Status */}
            <div className="border-t border-border/60 pt-4">
              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary font-display text-sm">
                      {user.username?.charAt(0).toUpperCase() || "R"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-bold">
                        {user.first_name || user.username}
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 py-2 font-mono text-xs font-semibold uppercase text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground"
                  >
                    <LogIn className="size-3.5" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 py-2 font-mono text-xs font-semibold uppercase text-muted-foreground"
                  >
                    <UserPlus className="size-3.5" />
                    Join Beta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Navigation Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/80 bg-card/60 backdrop-blur-xl h-screen sticky top-0 z-30">
        {/* Brand Header */}
        <div className="flex flex-col gap-1.5 p-6 border-b border-border/60">
          <Link to="/" className="inline-block transition-opacity hover:opacity-85">
            <Wordmark className="text-2xl" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Closed Beta
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">v0.1</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? currentPath === item.to
              : currentPath.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all",
                  active
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile / Session Card */}
        <div className="border-t border-border/60 p-4 bg-secondary/10">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <Link
                to={myProfilePath}
                className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-secondary/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary font-display text-sm">
                  {user.username?.charAt(0).toUpperCase() || "R"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xs font-bold group-hover:text-primary transition-colors">
                    {user.first_name || user.username}
                  </div>
                  <div className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
                    <span>@{user.username}</span>
                    {isAdministrator && (
                      <ShieldCheck className="size-3 text-primary inline" />
                    )}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground shadow transition hover:bg-primary/90"
              >
                <LogIn className="size-3.5" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
              >
                <UserPlus className="size-3.5" />
                Join Beta
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area with Smooth Route Fade-in */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className={cn("animate-fade-in", isDashboardPage && "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto")}>
          {children}
        </div>
      </main>
    </div>
  );
}
