import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Clock,
  Compass,
  Gauge,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { RequireRole } from "@/components/revv/RequireRole";
import {
  type AdminAnalyticsResponse,
  fetchAdminAnalytics,
  type UserTelemetryMetricItem,
} from "@/lib/api";
import { formatDateTime as formatShortDate, formatRelativeTime } from "@/lib/date";
import { cn, isAdminRole } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Data Science & Telemetry Analytics — REVV Admin" },
      {
        name: "description",
        content:
          "Administrator analytics, DAU/WAU/MAU cohorts, ride distance distributions, and user login telemetry.",
      },
    ],
  }),
  component: AdminAnalyticsPageGuard,
});

function AdminAnalyticsPageGuard() {
  return (
    <RequireRole
      allowed={isAdminRole}
      loadingFallback={
        <div className="p-8">
          <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      }
    >
      <AdminAnalyticsPage />
    </RequireRole>
  );
}

type UserSortKey = "last_active" | "last_login" | "logins" | "distance" | "trips";

function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<UserSortKey>("last_active");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAnalytics();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const filteredUsers = useMemo(() => {
    const list = [...(data?.user_metrics ?? [])];
    list.sort((a, b) => {
      if (sortBy === "last_login") {
        return new Date(b.last_login_at || 0).getTime() - new Date(a.last_login_at || 0).getTime();
      }
      if (sortBy === "logins") return b.login_count - a.login_count;
      if (sortBy === "distance") return b.total_distance_km - a.total_distance_km;
      if (sortBy === "trips") return b.total_trips - a.total_trips;
      return new Date(b.last_active_at || 0).getTime() - new Date(a.last_active_at || 0).getTime();
    });
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.last_device_model || "").toLowerCase().includes(q),
    );
  }, [data?.user_metrics, search, sortBy]);

  const s = data?.summary;
  const maxDailyKm = Math.max(1, ...(data?.daily_series.map((d) => d.distance_km) ?? [1]));
  const maxHourlyTrips = Math.max(
    1,
    ...(data?.hourly_distribution.map((h) => h.trips_count) ?? [1]),
  );
  const totalBucketTrips = Math.max(
    1,
    (data?.distance_buckets ?? []).reduce((acc, b) => acc + b.count, 0),
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
            <BarChart3 className="size-3.5" />
            <span>Admin Data Science &amp; Telemetry</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Rider Analytics &amp; User Metrics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time cohort engagement (DAU/WAU/MAU), distance histograms, riding hour
            distributions, and throttled user login telemetry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-secondary/50 px-4 py-2.5 font-mono text-xs font-bold uppercase hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading || !s ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-28 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KpiCard
              icon={Users}
              label="Active Users (DAU)"
              value={String(s.active_24h)}
              sub={`WAU: ${s.active_7d} • MAU: ${s.active_30d}`}
              accent="text-primary"
            />
            <KpiCard
              icon={Activity}
              label="Stickiness (DAU/MAU)"
              value={`${s.dau_mau_pct.toFixed(1)}%`}
              sub={`+${s.new_users_7d} new (7d) / ${s.total_users} total`}
              accent="text-emerald-400"
            />
            <KpiCard
              icon={Compass}
              label="Total Ride Distance"
              value={`${s.total_distance_km.toLocaleString()} km`}
              sub={`${s.total_trips} verified trips`}
              accent="text-amber-400"
            />
            <KpiCard
              icon={Clock}
              label="Total Ride Hours"
              value={`${s.total_duration_hours.toFixed(1)} h`}
              sub={`Avg ${s.avg_trip_distance_km} km / ${s.avg_trip_duration_min}m`}
              accent="text-sky-400"
            />
            <KpiCard
              icon={Gauge}
              label="Fleet Avg Speed"
              value={`${s.avg_speed_kmh.toFixed(1)} km/h`}
              sub={`Peak: ${s.max_speed_kmh.toFixed(0)} km/h`}
              accent="text-purple-400"
            />
            <KpiCard
              icon={TrendingUp}
              label="Social & Clubs"
              value={`${s.total_posts} Posts`}
              sub={`${s.total_clubs} active clubs`}
              accent="text-rose-400"
            />
          </div>

          {/* Charts Row 1: 14-Day Distance & Activity Trend + Distance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 14-Day Trend */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-black uppercase tracking-wider">
                    14-Day Ride Distance &amp; Active Riders Trend
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Daily kilometers ridden (bars) vs active riders &amp; trips (UTC)
                  </p>
                </div>
                <span className="font-mono text-[11px] text-primary">LAST 14 DAYS</span>
              </div>

              <div className="h-52 flex items-end gap-2 pt-6 pb-2 border-b border-border/60">
                {data.daily_series.map((d) => {
                  const pct = Math.max(4, Math.round((d.distance_km / maxDailyKm) * 100));
                  const shortDay = d.day.slice(5); // MM-DD
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-1.5 group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 z-10 whitespace-nowrap rounded bg-popover px-2 py-0.5 font-mono text-[10px] text-foreground shadow border border-border">
                        {d.distance_km} km • {d.trips_count} trips • {d.active_riders} riders
                      </div>
                      <div className="w-full h-36 flex items-end justify-center">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all group-hover:brightness-125"
                        />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">{shortDay}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distance Distribution Buckets */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h2 className="font-display text-sm font-black uppercase tracking-wider">
                  Trip Distance Distribution
                </h2>
                <p className="text-xs text-muted-foreground">
                  Segmentation of rides by distance range
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {data.distance_buckets.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No trip segments recorded yet.
                  </p>
                ) : (
                  data.distance_buckets.map((b) => {
                    const share = Math.round((b.count / totalBucketTrips) * 100);
                    return (
                      <div key={b.label} className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-foreground font-semibold">{b.label}</span>
                          <span className="text-muted-foreground">
                            {b.count} trips ({share}%) • {b.distance_km.toFixed(1)} km
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            style={{ width: `${Math.max(4, share)}%` }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2: 24-Hour Riding Clock + Top Garage Brands */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h2 className="font-display text-sm font-black uppercase tracking-wider">
                  Hourly Riding Distribution (00:00 – 23:00 UTC)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Peak departure hours across all recorded rides
                </p>
              </div>
              <div className="h-40 flex items-end gap-1.5 pt-4 pb-1 border-b border-border/60">
                {data.hourly_distribution.map((h) => {
                  const pct = Math.max(4, Math.round((h.trips_count / maxHourlyTrips) * 100));
                  return (
                    <div
                      key={h.hour_wib}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 z-10 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 font-mono text-[10px] border border-border">
                        {String(h.hour_wib).padStart(2, "0")}:00 — {h.trips_count} trips
                      </div>
                      <div className="w-full h-28 flex items-end justify-center">
                        <div
                          style={{ height: `${pct}%` }}
                          className={cn(
                            "w-full rounded-t",
                            h.trips_count > 0 ? "bg-emerald-400/80" : "bg-secondary/60",
                          )}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {String(h.hour_wib).padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h2 className="font-display text-sm font-black uppercase tracking-wider">
                  Top Garage Brands
                </h2>
                <p className="text-xs text-muted-foreground">
                  Most registered motorcycle manufacturers
                </p>
              </div>
              <div className="space-y-2.5">
                {data.top_brands.map((item) => (
                  <div
                    key={item.brand}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2 font-mono text-xs"
                  >
                    <span className="font-bold text-foreground">{item.brand}</span>
                    <span className="text-primary font-black">{item.count} bikes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Activity & Login Telemetry Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-black uppercase tracking-wider">
                  User Login &amp; Activity Telemetry ({filteredUsers.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Throttled 15-minute session tracking &amp; 6-hour device metadata sync for zero
                  battery overhead
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as UserSortKey)}
                  className="rounded-xl border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground"
                >
                  <option value="last_active">Sort: Last Active</option>
                  <option value="last_login">Sort: Last Login</option>
                  <option value="logins">Sort: Login Count</option>
                  <option value="distance">Sort: Total Distance</option>
                  <option value="trips">Sort: Total Trips</option>
                </select>

                <div className="relative w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter user, email, device…"
                    className="w-full rounded-xl border border-border bg-secondary/40 pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Rider</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Logins / Sessions</th>
                    <th className="py-3 px-4">Device / App</th>
                    <th className="py-3 px-4 text-right">Trips</th>
                    <th className="py-3 px-4 text-right">Distance</th>
                    <th className="py-3 px-4 text-right">Peak Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredUsers.map((u: UserTelemetryMetricItem) => (
                    <tr key={u.id} className="hover:bg-secondary/25">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{u.display_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          @{u.username} {u.email ? `• ${u.email}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-foreground font-semibold">
                          {u.last_active_at ? formatRelativeTime(u.last_active_at) : "Never"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatShortDate(u.last_active_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-foreground">
                          {u.last_login_at ? formatRelativeTime(u.last_login_at) : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatShortDate(u.last_login_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-bold text-primary">{u.login_count}</span>
                        <span className="text-muted-foreground"> / {u.session_count}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {u.last_platform || u.last_device_model ? (
                          <span className="inline-flex items-center gap-1">
                            <Smartphone className="size-3 text-primary" />
                            <span>
                              {u.last_device_model || u.last_platform}{" "}
                              {u.last_app_version ? `v${u.last_app_version}` : ""}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{u.total_trips}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                        {u.total_distance_km.toFixed(1)} km
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        {u.max_speed_kmh.toFixed(0)} km/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <Icon className={cn("size-4", accent)} />
      </div>
      <div>
        <div className={cn("font-display text-xl font-black", accent)}>{value}</div>
        <div className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>
      </div>
    </div>
  );
}
