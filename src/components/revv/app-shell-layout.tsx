import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import * as Popover from "@radix-ui/react-popover";
import {
  Activity,
  BarChart3,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  Crown,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  User,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "./wordmark";
import { RevvAvatar } from "./RevvAvatar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
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

interface NotificationsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: WebNotificationItem[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenNotification: (n: WebNotificationItem) => void;
  onDismissNotification: (e: React.MouseEvent, id: string) => void;
  side?: "bottom" | "right" | "top" | "left";
  align?: "start" | "center" | "end";
  trigger: ReactNode;
}

function NotificationsPopover({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllRead,
  onClearAll,
  onOpenNotification,
  onDismissNotification,
  side = "bottom",
  align = "end",
  trigger,
}: NotificationsPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="z-50 flex max-h-[min(75vh,520px)] w-[min(calc(100vw-1.5rem),380px)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close notifications"
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-2">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Clear all
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Bell className="mb-2.5 size-8 text-muted-foreground/45" />
                <p className="text-sm font-bold text-foreground">You're all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Messages, club mentions, and alerts will show up here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onOpenNotification(n)}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-secondary/50",
                    !n.is_read ? "bg-primary/[0.06]" : "opacity-80",
                  )}
                >
                  <div className="mt-1.5 shrink-0">
                    {!n.is_read ? (
                      <span title="Unread" className="block size-2 rounded-full bg-primary" />
                    ) : (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-xs",
                          !n.is_read
                            ? "font-bold text-foreground"
                            : "font-medium text-foreground/80",
                        )}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          New
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                    <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground/80">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.actor_username && n.notif_type !== "admin_broadcast" && (
                        <span>@{n.actor_username}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Dismiss"
                    onClick={(e) => onDismissNotification(e, n.id)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground opacity-65 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopNotifOpen, setDesktopNotifOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<WebNotificationItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    social: true,
    riding: true,
    you: true,
    admin: true,
    "admin-master": false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("revv_sidebar_collapsed") === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("revv_sidebar_collapsed", next ? "true" : "false");
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    let active = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const list = await fetchMyNotifications();
        if (active && Array.isArray(list)) {
          setNotifications(list);
        }
      } catch {
        // ignore transient poll errors
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    void load();
    const timer = setInterval(load, 20000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
    const customData = notif.payload?.["custom_data"] as Record<string, unknown> | undefined;
    const rawRoute = String(
      notif.payload?.["route"] ||
        notif.payload?.["link"] ||
        customData?.["route"] ||
        customData?.["link"] ||
        "",
    )
      .trim()
      .replace(/^\/+/, "");
    setDesktopNotifOpen(false);
    setMobileNotifOpen(false);
    if (notif.notif_type === "direct_message" || rawRoute.startsWith("chat/")) {
      navigate({ to: "/messages" });
      return;
    }
    if (rawRoute.startsWith("news/")) {
      navigate({ to: "/news" });
    } else if (rawRoute.startsWith("communities/") || rawRoute.startsWith("clubs/")) {
      const clubId = rawRoute
        .replace(/^(communities|clubs)\//, "")
        .split("/")[0]
        ?.trim();
      if (clubId) {
        navigate({ to: "/clubs/$id", params: { id: clubId } });
      } else {
        navigate({ to: "/clubs" });
      }
    } else if (rawRoute.startsWith("communities") || rawRoute.startsWith("clubs")) {
      navigate({ to: "/clubs" });
    } else if (rawRoute.startsWith("events")) {
      navigate({ to: "/clubs" });
    } else if (rawRoute.startsWith("profile/")) {
      const targetUser = rawRoute.replace(/^profile\//, "").trim();
      if (targetUser) {
        navigate({ to: "/id/$username", params: { username: targetUser } });
      }
    } else if (rawRoute === "garage") {
      navigate({ to: "/garage" });
    } else if (rawRoute === "feed") {
      navigate({ to: "/" });
    } else if (notif.notif_type !== "admin_broadcast" && notif.actor_username) {
      navigate({ to: "/id/$username", params: { username: notif.actor_username } });
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

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground antialiased">{children}</div>;
  }

  const roleLower = user?.role?.toLowerCase() ?? "user";
  const isAdministrator = roleLower === "administrator";
  const isModerator = roleLower === "moderator";
  const canAccessAdminSection = isAdministrator || isModerator;

  const myProfilePath = user?.username ? `/id/${encodeURIComponent(user.username)}` : "/id/me";

  interface NavLeafItem {
    id: string;
    label: string;
    to?: string;
    search?: Record<string, string>;
    icon: LucideIcon;
    exact?: boolean;
    children?: NavLeafItem[];
  }

  interface NavGroupItem {
    id: string;
    label: string;
    icon: LucideIcon;
    items: NavLeafItem[];
  }

  const adminMenuItems: NavLeafItem[] = isAdministrator
    ? [
        {
          id: "admin-overview",
          label: "Overview & Analytics",
          to: "/admin",
          search: { tab: "overview" },
          icon: BarChart3,
        },
        {
          id: "admin-users",
          label: "Users & Roles",
          to: "/admin",
          search: { tab: "users" },
          icon: Users,
        },
        {
          id: "admin-subscriptions",
          label: "Subscriptions & Tiers",
          to: "/admin",
          search: { tab: "subscriptions" },
          icon: Crown,
        },
        {
          id: "admin-cosmetics",
          label: "Cosmetics & Pricing",
          to: "/admin",
          search: { tab: "cosmetics" },
          icon: Sparkles,
        },
        {
          id: "admin-trips",
          label: "Trip Records",
          to: "/trip-records",
          icon: MapPin,
        },
        {
          id: "admin-analytics",
          label: "Telemetry Analytics",
          to: "/analytics",
          icon: Activity,
        },
        {
          id: "admin-master",
          label: "Master Data",
          icon: Database,
          children: [
            {
              id: "master-brands",
              label: "Brand & Motorcycle",
              to: "/admin",
              search: { tab: "master", sub: "brands" },
              icon: Wrench,
            },
            {
              id: "master-components",
              label: "Components",
              to: "/admin",
              search: { tab: "master", sub: "components" },
              icon: Sliders,
            },
            {
              id: "master-notifications",
              label: "Notification Templates",
              to: "/admin",
              search: { tab: "master", sub: "notifications" },
              icon: Bell,
            },
            {
              id: "master-emails",
              label: "Email Templates",
              to: "/admin",
              search: { tab: "master", sub: "emails" },
              icon: Mail,
            },
            {
              id: "master-settings",
              label: "General Settings",
              to: "/admin",
              search: { tab: "master", sub: "settings" },
              icon: Settings,
            },
          ],
        },
        {
          id: "admin-news",
          label: "News Desk",
          to: "/admin",
          search: { tab: "news" },
          icon: Newspaper,
        },
        {
          id: "admin-broadcast",
          label: "Push Broadcast",
          to: "/admin",
          search: { tab: "broadcast" },
          icon: Megaphone,
        },
        {
          id: "admin-support",
          label: "Support Inbox",
          to: "/admin",
          search: { tab: "support" },
          icon: LifeBuoy,
        },
        {
          id: "admin-legal",
          label: "Privacy & Legal",
          to: "/admin",
          search: { tab: "legal" },
          icon: Scale,
        },
        {
          id: "admin-health",
          label: "System Health",
          to: "/admin",
          search: { tab: "maintenance" },
          icon: Activity,
        },
      ]
    : isModerator
      ? [
          {
            id: "admin-news",
            label: "Moderator News Desk",
            to: "/admin",
            search: { tab: "news" },
            icon: Newspaper,
          },
        ]
      : [];

  const navGroups: NavGroupItem[] = [
    {
      id: "social",
      label: "Social",
      icon: Home,
      items: [
        { id: "home", label: "Feed", to: "/", icon: Home, exact: true },
        { id: "clubs", label: "Clubs", to: "/clubs", icon: Users },
        { id: "leaderboard", label: "Leaderboard", to: "/leaderboard", icon: Trophy },
        { id: "news", label: "News", to: "/news", icon: FileText },
      ],
    },
    {
      id: "riding",
      label: "Riding",
      icon: Compass,
      items: [
        { id: "garage", label: "Garage", to: "/garage", icon: Wrench },
        { id: "rides", label: "Routes & Radar", to: "/rides", icon: Compass },
        { id: "plans", label: "Plans & Shop", to: "/plans", icon: Crown },
      ],
    },
    {
      id: "you",
      label: "You",
      icon: User,
      items: [
        { id: "messages", label: "Messages", to: "/messages", icon: MessageSquare },
        { id: "profile", label: "Profile", to: myProfilePath, icon: User },
      ],
    },
    ...(canAccessAdminSection
      ? [
          {
            id: "admin",
            label: isAdministrator ? "Operations" : "Moderation",
            icon: LayoutDashboard,
            items: adminMenuItems,
          },
        ]
      : []),
  ];

  const currentPath = location.pathname;
  const currentSearchObj = (location.search ?? {}) as Record<string, string | undefined>;
  const currentTab = currentSearchObj["tab"];
  const currentSub = currentSearchObj["sub"];

  const isLeafActive = (item: NavLeafItem): boolean => {
    if (!item.to) return false;
    if (item.to === "/admin") {
      if (currentPath !== "/admin") return false;
      const targetTab =
        item.search?.["tab"] ?? (isModerator && !isAdministrator ? "news" : "overview");
      const effectiveTab = currentTab ?? (isModerator && !isAdministrator ? "news" : "overview");
      if (effectiveTab !== targetTab) return false;
      if (item.search?.["sub"]) {
        return (currentSub ?? "brands") === item.search["sub"];
      }
      return true;
    }
    return item.exact ? currentPath === item.to : currentPath.startsWith(item.to);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNavTree = (onNavigate?: () => void, collapsed = false) => {
    if (collapsed) {
      const flatItems: NavLeafItem[] = navGroups.flatMap((group) =>
        group.items.flatMap((item): NavLeafItem[] => {
          const firstChild = item.children?.[0];
          if (firstChild) {
            return [
              {
                id: item.id,
                label: item.label,
                to: firstChild.to ?? "/admin",
                ...(firstChild.search ? { search: firstChild.search } : {}),
                icon: item.icon,
              },
            ];
          }
          return [item];
        }),
      );
      return (
        <div className="space-y-1.5">
          {flatItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === "admin-master"
                ? currentPath === "/admin" && currentTab === "master"
                : isLeafActive(item);
            return (
              <Link
                key={item.id}
                to={item.to ?? "/"}
                search={item.search as never}
                onClick={onNavigate}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-primary/15 text-primary border border-primary/35 shadow-xs"
                    : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
              </Link>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = expandedGroups[group.id] ?? true;
          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="size-3.5 text-primary" />
                  <span>{group.label}</span>
                </span>
                {isGroupOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>

              {isGroupOpen && (
                <div className="ml-2.5 space-y-0.5 border-l border-border/70 pl-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    if (item.children && item.children.length > 0) {
                      const isSubOpen = expandedGroups[item.id] ?? currentTab === "master";
                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
                              currentPath === "/admin" && currentTab === "master"
                                ? "bg-primary/15 text-primary font-semibold"
                                : "text-foreground/85 hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon className="size-4 shrink-0" />
                              <span>{item.label}</span>
                            </span>
                            {isSubOpen ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                          {isSubOpen && (
                            <div className="ml-3 space-y-0.5 border-l border-border/70 pl-2.5">
                              {item.children.map((sub) => {
                                const SubIcon = sub.icon;
                                const subActive = isLeafActive(sub);
                                return (
                                  <Link
                                    key={sub.id}
                                    to={sub.to ?? "/admin"}
                                    search={sub.search as never}
                                    onClick={onNavigate}
                                    className={cn(
                                      "flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                                      subActive
                                        ? "bg-primary/15 text-primary font-semibold"
                                        : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                                    )}
                                  >
                                    <SubIcon className="size-3.5 shrink-0" />
                                    <span className="truncate">{sub.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const active = isLeafActive(item);
                    return (
                      <Link
                        key={item.id}
                        to={item.to ?? "/"}
                        search={item.search as never}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/15 text-primary font-semibold shadow-2xs"
                            : "text-foreground/85 hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const isDashboardPage =
    currentPath.startsWith("/id") ||
    currentPath === "/garage" ||
    currentPath === "/rides" ||
    currentPath === "/messages" ||
    currentPath === "/leaderboard" ||
    currentPath === "/analytics" ||
    currentPath === "/trip-records" ||
    currentPath === "/admin";

  const mobileBottomItems = [
    { id: "feed", label: "Feed", to: "/", icon: Home, exact: true },
    { id: "clubs", label: "Clubs", to: "/clubs", icon: Users },
    { id: "garage", label: "Garage", to: "/garage", icon: Wrench },
    { id: "messages", label: "Chat", to: "/messages", icon: MessageSquare },
    { id: "profile", label: "Profile", to: myProfilePath, icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased md:flex-row">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-3.5 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
            className="rounded-xl border border-border bg-secondary/60 p-2 text-foreground transition hover:bg-secondary"
          >
            <Menu className="size-4" />
          </button>
          <Link to="/" className="flex items-center">
            <Wordmark className="text-xl" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-foreground"
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <NotificationsPopover
            open={mobileNotifOpen}
            onOpenChange={setMobileNotifOpen}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onClearAll={handleClearAll}
            onOpenNotification={handleOpenNotification}
            onDismissNotification={handleDismissNotification}
            side="bottom"
            align="end"
            trigger={
              <button
                type="button"
                aria-label="Open Notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-foreground transition hover:bg-secondary"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            }
          />

          {user && (
            <Link
              to={myProfilePath}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium"
            >
              <RevvAvatar
                src={user.avatar_url}
                name={user.username ?? "Rider"}
                frameCode={user.equipped_frame_code}
                showVerifiedBadge={user.is_verified_profile}
                size={26}
              />
              <span className="max-w-[76px] truncate">@{user.username}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[82vw] flex-col border-r border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <Link to="/" onClick={() => setMobileOpen(false)}>
                <Wordmark className="text-2xl" />
              </Link>
              <div className="flex items-center gap-1.5">
                <LanguageSwitcher compact />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto pr-1">
              {renderNavTree(() => setMobileOpen(false))}
            </nav>

            <div className="border-t border-border pt-4">
              {user && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <RevvAvatar
                      src={user.avatar_url}
                      name={user.first_name || user.username || "Rider"}
                      frameCode={user.equipped_frame_code}
                      showVerifiedBadge={user.is_verified_profile}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-bold">
                        {user.first_name || user.username}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2 text-xs font-semibold text-foreground/85 transition hover:bg-destructive/15 hover:text-destructive"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-border bg-card/90 backdrop-blur-xl transition-[width] duration-200 md:flex",
          sidebarCollapsed ? "w-[74px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex border-b border-border",
            sidebarCollapsed ? "flex-col items-center gap-3 p-3" : "flex-col gap-2.5 p-4",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            {!sidebarCollapsed ? (
              <Link to="/" className="inline-block transition-opacity hover:opacity-85">
                <Wordmark className="text-2xl" />
              </Link>
            ) : (
              <Link
                to="/"
                title="REVV Home"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 font-display text-sm font-black text-primary"
              >
                R
              </Link>
            )}
            <div className="flex items-center gap-1.5">
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                  aria-label="Toggle theme"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/80 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/80 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between gap-2">
              <LanguageSwitcher compact />
              <NotificationsPopover
                open={desktopNotifOpen}
                onOpenChange={setDesktopNotifOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllRead}
                onClearAll={handleClearAll}
                onOpenNotification={handleOpenNotification}
                onDismissNotification={handleDismissNotification}
                side="right"
                align="start"
                trigger={
                  <button
                    type="button"
                    aria-label="Open Notifications"
                    className="relative inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <Bell className="size-3.5 text-primary" />
                    <span>Alerts</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                }
              />
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-2.5 py-4">
          {renderNavTree(undefined, sidebarCollapsed)}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center gap-1.5 pt-2">
              <NotificationsPopover
                open={desktopNotifOpen}
                onOpenChange={setDesktopNotifOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllRead}
                onClearAll={handleClearAll}
                onOpenNotification={handleOpenNotification}
                onDismissNotification={handleDismissNotification}
                side="right"
                align="end"
                trigger={
                  <button
                    type="button"
                    title="Notifications"
                    aria-label="Notifications"
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl text-foreground/75 transition hover:bg-secondary hover:text-foreground"
                  >
                    <Bell className="size-5 shrink-0" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                }
              />
              <button
                type="button"
                onClick={toggleTheme}
                title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                aria-label="Toggle theme"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground/75 transition hover:bg-secondary hover:text-foreground"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </button>
            </div>
          )}
        </nav>

        <div className="border-t border-border bg-secondary/25 p-3">
          {user ? (
            sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link to={myProfilePath} title={`@${user.username}`}>
                  <RevvAvatar
                    src={user.avatar_url}
                    name={user.username ?? "Rider"}
                    frameCode={user.equipped_frame_code}
                    showVerifiedBadge={user.is_verified_profile}
                    size={38}
                  />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Link
                  to={myProfilePath}
                  className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-secondary/70"
                >
                  <RevvAvatar
                    src={user.avatar_url}
                    name={user.first_name || user.username || "Rider"}
                    frameCode={user.equipped_frame_code}
                    showVerifiedBadge={user.is_verified_profile}
                    size={38}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {user.first_name || user.username}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <span>@{user.username}</span>
                      {isAdministrator && <ShieldCheck className="inline size-3.5 text-primary" />}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground/85 transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                  <Link
                    to="/privacy"
                    className="rounded-xl border border-border bg-background/70 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-primary"
                  >
                    Legal
                  </Link>
                </div>
              </div>
            )
          ) : (
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-xs"
            >
              <LogIn className="size-4" />
              {!sidebarCollapsed && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-6">
        <div
          className={cn(
            "animate-fade-in",
            isDashboardPage && "mx-auto max-w-7xl p-4 sm:p-6 lg:p-8",
          )}
        >
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? currentPath === item.to
            : item.id === "profile"
              ? currentPath.startsWith("/id")
              : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
