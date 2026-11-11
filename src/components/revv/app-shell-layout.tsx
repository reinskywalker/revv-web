import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Trash2,
  User,
  Wrench,
  X,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Wordmark } from "./wordmark";
import { useAuth } from "@/lib/auth-context";
import {
  clearAllMyNotifications,
  deleteNotificationById,
  fetchMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type WebNotificationItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface AppShellLayoutProps {
  children: ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<WebNotificationItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const list = await fetchMyNotifications();
        if (active && Array.isArray(list)) {
          setNotifications(list);
        }
      } catch {
        // ignore
      }
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpenNotification = async (notif: WebNotificationItem) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item)),
      );
      markNotificationAsRead(notif.id).catch(() => {});
    }
    if (notif.notif_type === "direct_message") {
      setNotifications((prev) => prev.filter((item) => item.id !== notif.id));
      deleteNotificationById(notif.id).catch(() => {});
    }
    const customData = notif.payload?.custom_data || {};
    const rawRoute = String(
      notif.payload?.route ||
        notif.payload?.link ||
        customData?.route ||
        customData?.link ||
        "",
    ).trim();
    setNotifOpen(false);
    if (rawRoute.startsWith("news/")) {
      navigate({ to: "/news" });
    } else if (rawRoute.startsWith("profile/")) {
      const targetUser = rawRoute.replace(/^profile\//, "").trim();
      if (targetUser) {
        navigate({ to: `/id/${encodeURIComponent(targetUser)}` as any });
      }
    } else if (rawRoute === "garage") {
      navigate({ to: "/garage" });
    } else if (rawRoute === "feed") {
      navigate({ to: "/" });
    } else if (notif.notif_type !== "admin_broadcast" && notif.actor_username) {
      navigate({ to: `/id/${encodeURIComponent(notif.actor_username)}` as any });
    }
  };

  const handleDismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    deleteNotificationById(id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    markAllNotificationsAsRead().catch(() => {});
  };

  const handleClearAll = async () => {
    setNotifications([]);
    clearAllMyNotifications().catch(() => {});
  };

  // The left navigation sidebar is ONLY visible when the user is logged in.
  // When logged out, render in standard full-screen public layout.
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground antialiased">{children}</div>;
  }

  const isAdministrator =
    user?.role?.toLowerCase() === "administrator" ||
    user?.role?.toLowerCase() === "moderator";

  const myProfilePath = user?.username ? `/id/${encodeURIComponent(user.username)}` : "/id/me";

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
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label="Open Notifications"
              className="relative rounded-lg border border-border bg-secondary/40 p-2 text-foreground transition hover:bg-secondary"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-black text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}
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
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-secondary/40 hover:text-foreground"
          >
            <span className="flex items-center gap-3">
              <Bell className="size-4 shrink-0 text-muted-foreground" />
              <span>Notifications</span>
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] font-black text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
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

      {/* Notifications Drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setNotifOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Bell className="size-4 text-primary" />
                <h2 className="font-display text-base font-black uppercase tracking-wider">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center justify-between border-b border-border/50 bg-secondary/20 px-5 py-2.5">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-primary hover:underline"
                >
                  <CheckCheck className="size-3.5" />
                  Mark All Read
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Clear All
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Bell className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    All Caught Up
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    New broadcasts, direct messages, and community alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={cn(
                      "group relative flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-secondary/40",
                      !n.is_read ? "bg-primary/[0.06]" : "bg-transparent opacity-80",
                    )}
                  >
                    <div className="mt-1 shrink-0">
                      {!n.is_read ? (
                        <span
                          title="Unread"
                          className="block size-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(238,75,62,0.8)]"
                        />
                      ) : (
                        <Check className="size-3.5 text-emerald-400" title="Read" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs truncate",
                            !n.is_read
                              ? "font-black text-foreground"
                              : "font-semibold text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                            !n.is_read
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {!n.is_read ? "UNREAD" : "READ"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground/70">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        {n.actor_username && n.notif_type !== "admin_broadcast" && (
                          <span>@{n.actor_username}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Clear notification"
                      onClick={(e) => handleDismissNotification(e, n.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-60 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
