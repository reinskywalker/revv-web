import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Compass,
  Home,
  MessageSquare,
  Navigation,
  Send,
  User,
} from "lucide-react";
import bikeDetail from "@/assets/bike-detail.jpg";
import routeMapDark from "@/assets/route-map-dark.jpg";
import { cn } from "@/lib/utils";

/** CSS-recreated REVV app screens inside phone frames — the web keeps the app's aesthetic. */

function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-[280px] rounded-[2.5rem] border border-border bg-secondary p-2 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2rem] bg-background text-foreground">
          {children}
        </div>
      </div>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-panel-muted">
        {label}
      </p>
    </div>
  );
}

const tabItems = [
  { key: "feed", label: "Feed", icon: Home },
  { key: "community", label: "Community", icon: Compass },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "profile", label: "Profile", icon: User },
] as const;

type TabKey = (typeof tabItems)[number]["key"];

function AppTabBar({ active }: { active: TabKey }) {
  const first = tabItems.slice(0, 2);
  const last = tabItems.slice(2);
  const renderItem = (item: (typeof tabItems)[number]) => {
    const Icon = item.icon;
    const isActive = item.key === active;
    return (
      <div
        key={item.key}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-4" strokeWidth={2.2} />
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.15em]">{item.label}</span>
      </div>
    );
  };
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-stretch border-t border-border bg-card">
      {first.map(renderItem)}
      <div className="flex w-14 items-stretch justify-center bg-primary">
        <div className="flex items-center">
          <Send className="size-5 text-primary-foreground" strokeWidth={2.2} />
        </div>
      </div>
      {last.map(renderItem)}
    </div>
  );
}

export function FeedPhone() {
  return (
    <PhoneFrame label="01 · Rider Feed">
      <div className="flex h-full flex-col gap-2 px-3 pt-4 pb-16">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[0.7rem] font-black uppercase tracking-tight">
            Motorcycle News
          </p>
          <p className="font-mono text-[0.45rem] uppercase tracking-[0.15em] text-muted-foreground">
            4 Articles
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center justify-between">
            <span className="bg-primary rounded px-1 py-0.5 font-mono text-[0.4rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
              Maintenance
            </span>
            <span className="font-mono text-[0.4rem] uppercase tracking-[0.1em] text-muted-foreground">
              4 min read
            </span>
          </div>
          <p className="font-display mt-1 text-[0.55rem] font-black uppercase leading-tight">
            Pre-Touring Checklist
          </p>
          <p className="mt-0.5 line-clamp-2 text-[0.45rem] leading-snug text-muted-foreground">
            Long-haul highway and mountain stages push brake fluid temperatures, tire pressures,
            and drive chains far harder than the city commute.
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <p className="font-display text-[0.7rem] font-black uppercase tracking-tight">
            Revv Rider Feed
          </p>
          <span className="text-muted-foreground">›</span>
        </div>
        <div className="mt-1 flex flex-1 flex-col rounded-t-xl border border-border bg-card">
          <div className="flex items-center gap-2 p-2">
            <div className="size-6 rounded-full bg-secondary" />
            <div>
              <p className="text-[0.5rem] font-semibold">Reynaldi Lusikoy</p>
              <p className="font-mono text-[0.4rem] text-muted-foreground">xox8 · 29 Oct 2026</p>
            </div>
          </div>
          <img
            src={bikeDetail}
            alt=""
            loading="lazy"
            width={1024}
            height={1024}
            className="min-h-0 w-full flex-1 object-cover"
          />
        </div>
      </div>
      <AppTabBar active="feed" />
    </PhoneFrame>
  );
}

export function NavPhone() {
  return (
    <PhoneFrame label="02 · Navigation">
      <div className="relative h-full">
        <img
          src={routeMapDark}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative flex h-full flex-col p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 rounded-md border border-border bg-card/90 px-1.5 py-1">
              <ArrowLeft className="size-3" />
              <span className="font-mono text-[0.45rem] uppercase tracking-[0.15em]">Live GPS</span>
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border bg-card/90 px-1.5 py-1">
              <Bell className="size-3" />
              <span className="font-mono text-[0.45rem]">100</span>
            </span>
          </div>
          <div className="mt-auto">
            <div className="flex items-center justify-between rounded-md bg-primary px-2 py-1.5">
              <span className="font-mono text-[0.45rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
                172 m · Turn left
              </span>
              <span className="font-mono text-[0.45rem] text-primary-foreground/80">Karawang</span>
            </div>
            <div className="mt-1.5 rounded-md bg-card/95 px-2 py-2">
              <p className="font-mono text-[0.45rem] uppercase tracking-[0.1em]">
                Active route: Karawang
              </p>
              <p className="font-mono text-[0.4rem] uppercase tracking-[0.1em] text-muted-foreground">
                Remaining 60.1 km · Completed 0.0 km
              </p>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-md bg-card/95 px-2 py-2">
              <div>
                <p className="font-display text-[0.6rem] font-black uppercase">Karawang</p>
                <p className="font-mono text-[0.4rem] uppercase tracking-[0.1em] text-muted-foreground">
                  60.1 km · 50 min
                </p>
              </div>
              <span className="bg-primary rounded px-2 py-1 font-mono text-[0.45rem] font-bold uppercase tracking-[0.1em] text-primary-foreground">
                Start
              </span>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function ProfilePhone() {
  return (
    <PhoneFrame label="03 · Rider System">
      <div className="flex h-full flex-col gap-2 px-3 pt-4 pb-16">
        <p className="font-mono text-[0.45rem] uppercase tracking-[0.2em] text-muted-foreground">
          Revv / Rider System
        </p>
        <p className="font-display text-sm font-black uppercase tracking-tight">My Profile</p>
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <img
              src={bikeDetail}
              alt=""
              loading="lazy"
              width={1024}
              height={1024}
              className="size-9 rounded-full object-cover"
            />
            <div>
              <p className="text-[0.55rem] font-bold">Reynaldi Lusikoy</p>
              <p className="font-mono text-[0.45rem] text-primary">@xoxo</p>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <span className="rounded border border-success/50 px-1 py-0.5 font-mono text-[0.4rem] uppercase tracking-[0.1em] text-success">
              Email verified
            </span>
            <span className="rounded border border-warning/50 px-1 py-0.5 font-mono text-[0.4rem] uppercase tracking-[0.1em] text-warning">
              Phone pending
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[0.4rem] uppercase tracking-[0.1em] text-muted-foreground">
            Jakarta · DEV
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="font-display text-[0.55rem] font-black uppercase">Cockpit Theme</p>
          <div className="mt-1 grid grid-cols-3 gap-1">
            <span className="rounded border border-border px-1 py-1 text-center font-mono text-[0.4rem] uppercase text-muted-foreground">
              Match
            </span>
            <span className="rounded border border-primary px-1 py-1 text-center font-mono text-[0.4rem] font-bold uppercase text-primary">
              Dark
            </span>
            <span className="rounded border border-border px-1 py-1 text-center font-mono text-[0.4rem] uppercase text-muted-foreground">
              Light
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center justify-between">
            <p className="font-display text-[0.55rem] font-black uppercase">Digital Garage</p>
            <span className="font-mono text-[0.4rem] uppercase tracking-[0.1em] text-primary">
              02 Bikes
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded border border-border bg-secondary/60 p-1.5">
            <div className="flex size-7 items-center justify-center rounded bg-secondary">
              <Navigation className="size-3 text-primary" />
            </div>
            <div>
              <p className="text-[0.5rem] font-bold">AO TENSHI</p>
              <p className="font-mono text-[0.4rem] text-muted-foreground">Yamaha · YZF-R25</p>
            </div>
          </div>
        </div>
      </div>
      <AppTabBar active="profile" />
    </PhoneFrame>
  );
}
