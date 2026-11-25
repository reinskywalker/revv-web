import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Gauge,
  Search,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { type AdminAnalyticsResponse, type AdminDashboardStats } from "@/lib/api";
import { formatDateTime as formatShortDate } from "@/lib/date";

type UserSortKey = "last_active" | "last_login" | "logins" | "distance" | "trips";

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="hud-card p-5 space-y-2">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={`font-display text-2xl sm:text-3xl font-black ${accent || "text-foreground"}`}
      >
        {value}
      </div>
      <div className="text-sm text-foreground/75 truncate">{sub}</div>
    </div>
  );
}

export function AdminOverviewAnalyticsPanel({
  adminStats,
  analytics,
}: {
  adminStats: AdminDashboardStats | null;
  analytics: AdminAnalyticsResponse | null;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<UserSortKey>("last_active");
  const [showTelemetry, setShowTelemetry] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...(analytics?.user_metrics ?? [])].filter((u) => {
      if (!q) return true;
      return (
        u.display_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.last_device_model || "").toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      if (sortBy === "last_login") {
        return new Date(b.last_login_at || 0).getTime() - new Date(a.last_login_at || 0).getTime();
      }
      if (sortBy === "logins") return b.login_count - a.login_count;
      if (sortBy === "distance") return b.total_distance_km - a.total_distance_km;
      if (sortBy === "trips") return b.total_trips - a.total_trips;
      return new Date(b.last_active_at || 0).getTime() - new Date(a.last_active_at || 0).getTime();
    });
    return list;
  }, [analytics?.user_metrics, search, sortBy]);

  const maxDailyKm = useMemo(
    () => Math.max(1, ...(analytics?.daily_series.map((d) => d.distance_km) ?? [1])),
    [analytics?.daily_series],
  );
  const maxHourlyTrips = useMemo(
    () => Math.max(1, ...(analytics?.hourly_distribution.map((h) => h.trips_count) ?? [1])),
    [analytics?.hourly_distribution],
  );
  const totalBucketTrips = useMemo(
    () => Math.max(1, analytics?.distance_buckets.reduce((acc, item) => acc + item.count, 0) ?? 1),
    [analytics?.distance_buckets],
  );

  return (
    <div className="space-y-6">
      {/* System Counts Summary */}
      {adminStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Active Riders", adminStats.active_users],
            ["Suspended / Del", `${adminStats.suspended_users} / ${adminStats.deleted_users}`],
            ["Digital Garages", adminStats.total_garages],
            ["Feed Posts", adminStats.total_feed_posts],
            [
              "Master Models",
              adminStats.total_master_motorcycles ?? adminStats.master_motorcycles_count ?? 0,
            ],
            [
              "Components",
              adminStats.total_master_components ?? adminStats.master_components_count ?? 0,
            ],
          ].map(([title, value]) => (
            <div key={String(title)} className="hud-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                {title}
              </p>
              <p className="font-display mt-1.5 text-2xl font-black text-primary">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Telemetry & Cohort Analytics */}
      {analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              icon={<Activity className="size-4 text-emerald-400" />}
              label="Active Riders (DAU / WAU / MAU)"
              value={`${analytics.summary.active_24h} / ${analytics.summary.active_7d} / ${analytics.summary.active_30d}`}
              sub={`Stickiness (DAU/MAU): ${analytics.summary.dau_mau_pct.toFixed(1)}%`}
              accent="text-emerald-400"
            />
            <KpiCard
              icon={<Users className="size-4 text-primary" />}
              label="Total & New Riders (7d)"
              value={String(analytics.summary.total_users)}
              sub={`+${analytics.summary.new_users_7d} joined last 7 days`}
            />
            <KpiCard
              icon={<Compass className="size-4 text-sky-400" />}
              label="Cumulative Distance"
              value={`${analytics.summary.total_distance_km.toLocaleString("id-ID", {
                maximumFractionDigits: 1,
              })} km`}
              sub={`${analytics.summary.total_trips} trips · ${analytics.summary.total_duration_hours.toFixed(1)}h`}
            />
            <KpiCard
              icon={<TrendingUp className="size-4 text-amber-400" />}
              label="Avg Trip Profile"
              value={`${analytics.summary.avg_trip_distance_km.toFixed(1)} km`}
              sub={`${analytics.summary.avg_trip_duration_min.toFixed(0)} min avg duration`}
            />
            <KpiCard
              icon={<Gauge className="size-4 text-primary" />}
              label="Fleet Avg / Peak Speed"
              value={`${analytics.summary.avg_speed_kmh.toFixed(1)} km/h`}
              sub={`Peak telemetry: ${analytics.summary.max_speed_kmh.toFixed(1)} km/h`}
            />
            <KpiCard
              icon={<Zap className="size-4 text-purple-400" />}
              label="Social & Clubs"
              value={`${analytics.summary.total_posts} posts`}
              sub={`${analytics.summary.total_clubs} active clubs / communities`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 14-Day Trend */}
            <div className="hud-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    14-Day Distance &amp; Active Riders
                  </h3>
                  <p className="text-sm text-foreground/75">
                    Daily ride kilometers aggregated from telemetry
                  </p>
                </div>
              </div>
              <div className="h-44 flex items-end gap-1.5 pt-4">
                {analytics.daily_series.map((d) => {
                  const pct = Math.max(4, Math.round((d.distance_km / maxDailyKm) * 100));
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs text-foreground/75 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.distance_km.toFixed(0)}
                      </span>
                      <div className="w-full bg-secondary/40 rounded-t-md h-32 flex items-end overflow-hidden">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full bg-primary/80 group-hover:bg-primary transition-all rounded-t-md"
                          title={`${d.day}: ${d.distance_km} km · ${d.trips_count} trips`}
                        />
                      </div>
                      <span className="text-xs text-foreground/75">{d.day.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distance Buckets */}
            <div className="hud-card p-6 space-y-4">
              <div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Compass className="size-4 text-sky-400" />
                  Trip Distance Distribution
                </h3>
                <p className="text-sm text-foreground/75">
                  Segmentation of completed trips across distance brackets
                </p>
              </div>
              <div className="space-y-3 pt-1">
                {analytics.distance_buckets.map((b) => {
                  const pct = Math.round((b.count / totalBucketTrips) * 100);
                  return (
                    <div key={b.label} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span>{b.label}</span>
                        <span className="text-muted-foreground">
                          {b.count} trips ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-400 transition-all"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly Riding Distribution (WIB) */}
            <div className="hud-card p-6 space-y-4">
              <div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Clock className="size-4 text-amber-400" />
                  24-Hour Riding Activity (WIB / GMT+7)
                </h3>
                <p className="text-sm text-foreground/75">
                  Peak sunmori &amp; commuting departure hours
                </p>
              </div>
              <div className="h-36 flex items-end gap-1 pt-2">
                {analytics.hourly_distribution.map((h) => {
                  const pct = Math.max(4, Math.round((h.trips_count / maxHourlyTrips) * 100));
                  return (
                    <div key={h.hour_wib} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full h-28 bg-secondary/30 rounded-t flex items-end overflow-hidden">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full bg-amber-400/80 group-hover:bg-amber-400 rounded-t transition-all"
                          title={`${String(h.hour_wib).padStart(2, "0")}:00 WIB — ${h.trips_count} trips`}
                        />
                      </div>
                      {h.hour_wib % 4 === 0 ? (
                        <span className="text-xs text-foreground/75">
                          {String(h.hour_wib).padStart(2, "0")}
                        </span>
                      ) : (
                        <span className="text-xs text-transparent">·</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Garage Brands */}
            <div className="hud-card p-6 space-y-4">
              <div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider">
                  Top Motorcycle Brands in Garage
                </h3>
                <p className="text-sm text-foreground/75">
                  Distribution across registered rider garages
                </p>
              </div>
              <div className="space-y-2.5">
                {analytics.top_brands.slice(0, 7).map((item) => {
                  const maxBrand = Math.max(1, analytics.top_brands[0]?.count ?? 1);
                  const pct = Math.round((item.count / maxBrand) * 100);
                  return (
                    <div key={item.brand} className="flex items-center gap-3 font-mono text-xs">
                      <span className="w-28 truncate font-semibold">{item.brand}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Login & Activity Telemetry (Collapsed by default to keep dashboard clean) */}
          <div className="hud-card p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold tracking-tight">
                  Recent Rider Activity ({filteredUsers.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Inspect login timestamps, sessions, and mobile versions on demand.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTelemetry((v) => !v)}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary sm:self-auto"
              >
                {showTelemetry ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    Hide Activity Log
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    Show Activity Log ({filteredUsers.length})
                  </>
                )}
              </button>
            </div>

            {showTelemetry && (
              <>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter rider, email, device…"
                      className="rounded-xl border border-border bg-secondary/40 pl-8 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as UserSortKey)}
                    className="rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-xs"
                  >
                    <option value="last_active">Sort: Last Active</option>
                    <option value="last_login">Sort: Last Login</option>
                    <option value="logins">Sort: Login Count</option>
                    <option value="distance">Sort: Distance</option>
                    <option value="trips">Sort: Trips</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/70 text-xs font-semibold uppercase tracking-wide text-foreground/80">
                      <tr>
                        <th className="py-2.5 pr-3">Rider</th>
                        <th className="py-2.5 px-3">Last Active</th>
                        <th className="py-2.5 px-3">Last Login</th>
                        <th className="py-2.5 px-3 text-right">Logins</th>
                        <th className="py-2.5 px-3 text-right">Sessions</th>
                        <th className="py-2.5 px-3">Platform / Device</th>
                        <th className="py-2.5 pl-3 text-right">Trips / Dist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUsers.slice(0, 100).map((u) => (
                        <tr key={u.id} className="hover:bg-secondary/20">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate max-w-[160px]">
                                  {u.display_name}
                                </div>
                                <div className="text-xs text-muted-foreground">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-sm">
                            {formatShortDate(u.last_active_at)}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-muted-foreground">
                            {formatShortDate(u.last_login_at)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right font-semibold">
                            {u.login_count}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-muted-foreground">
                            {u.session_count}
                          </td>
                          <td className="py-2.5 px-3 text-sm">
                            <span className="uppercase">{u.last_platform || "—"}</span>
                            {u.last_app_version ? ` v${u.last_app_version}` : ""}
                            {u.last_device_model ? ` · ${u.last_device_model}` : ""}
                          </td>
                          <td className="py-2.5 pl-3 font-mono text-right">
                            {u.total_trips} · {u.total_distance_km.toFixed(1)} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
