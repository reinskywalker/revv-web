import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Clock,
  Compass,
  Flame,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Trophy,
  Zap,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { RevvAvatar, VerifiedCheckBadge } from "@/components/revv/RevvAvatar";
import {
  adminRefreshLeaderboard,
  fetchMyProfile,
  fetchPublicLeaderboard,
  type LeaderboardEntry,
  type LeaderboardResponse,
  updateMyPreferences,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDuration as formatDurationHours } from "@/lib/date";
import { cn, isAdminRole } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Daily Rider Leaderboard — REVV" },
      {
        name: "description",
        content:
          "Top REVV riders ranked by verified GPS distance, ride frequency, and peak telemetry.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type SortMetric = "distance" | "trips" | "max_speed" | "avg_speed";

function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<SortMetric>("distance");
  const [search, setSearch] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [changesRemaining, setChangesRemaining] = useState(2);
  const [togglingOptIn, setTogglingOptIn] = useState(false);
  const [optInCooldown, setOptInCooldown] = useState(false);
  const [optInMessage, setOptInMessage] = useState<string | null>(null);
  const [confirmHideOpen, setConfirmHideOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void fetchMyProfile()
      .then((profile) => {
        if (!active) return;
        if (typeof profile.leaderboard_opt_in === "boolean") {
          setOptIn(profile.leaderboard_opt_in);
        }
        if (typeof profile.leaderboard_opt_changes_remaining === "number") {
          setChangesRemaining(profile.leaderboard_opt_changes_remaining);
        } else {
          setChangesRemaining(profile.leaderboard_opt_in === false ? 1 : 2);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const executeToggleOptIn = async (nextValue: boolean) => {
    if (!isAuthenticated || togglingOptIn || optInCooldown || changesRemaining <= 0) return;
    setTogglingOptIn(true);
    setOptInMessage(null);
    setError(null);
    try {
      const res = await updateMyPreferences({ leaderboard_opt_in: nextValue });
      setOptIn(nextValue);
      const rem = res["leaderboard_opt_changes_remaining"];
      if (typeof rem === "number") {
        setChangesRemaining(rem);
      } else {
        setChangesRemaining((prev) => Math.max(0, prev - 1));
      }
      setOptInCooldown(true);
      setTimeout(() => setOptInCooldown(false), 5000);
      if (!nextValue) {
        if (user?.id) {
          setData((prev) => {
            if (!prev) return prev;
            const filtered = prev.entries
              .filter((e) => e.user_id !== user.id)
              .map((e, idx) => ({ ...e, rank: idx + 1 }));
            return { ...prev, entries: filtered };
          });
        }
        setOptInMessage("You are now hidden from the public rider rankings across Web & Mobile.");
      } else {
        setOptInMessage(
          "You're back on the leaderboard! Your rank will appear after the midnight WIB daily update.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ranking visibility.");
    } finally {
      setTogglingOptIn(false);
    }
  };

  const handleToggleOptIn = () => {
    if (!isAuthenticated || togglingOptIn || optInCooldown || changesRemaining <= 0) return;
    if (optIn) {
      setConfirmHideOpen(true);
      return;
    }
    void executeToggleOptIn(true);
  };

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPublicLeaderboard();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const handleAdminForceRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await adminRefreshLeaderboard();
      setData(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh leaderboard cache.");
    } finally {
      setRefreshing(false);
    }
  };

  const sortedEntries = useMemo(() => {
    const list = [...(data?.entries ?? [])];
    list.sort((a, b) => {
      if (metric === "trips")
        return b.total_trips - a.total_trips || b.total_distance_km - a.total_distance_km;
      if (metric === "max_speed")
        return b.max_speed_kmh - a.max_speed_kmh || b.total_distance_km - a.total_distance_km;
      if (metric === "avg_speed")
        return b.avg_speed_kmh - a.avg_speed_kmh || b.total_distance_km - a.total_distance_km;
      return b.total_distance_km - a.total_distance_km || b.total_trips - a.total_trips;
    });
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.display_name.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        (item.city || "").toLowerCase().includes(q) ||
        (item.primary_bike || "").toLowerCase().includes(q),
    );
  }, [data?.entries, metric, search]);

  const topThree = sortedEntries.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main
        className={cn(
          "flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pb-20",
          isAuthenticated ? "pt-8" : "pt-28",
        )}
      >
        {/* Header Banner */}
        <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                <Trophy className="size-3.5" />
                <span>Updated Daily at Midnight WIB</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight">
                REVV Rider Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Ranked across verified rides (0.3 km or longer). Rankings update automatically every
                night at midnight WIB.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 font-mono text-xs text-muted-foreground">
              {data && (
                <>
                  <span>
                    LAST UPDATED: <strong className="text-foreground">{data.snapshot_date}</strong>
                  </span>
                  <span>
                    NEXT UPDATE: <strong className="text-primary">{data.next_refresh_wib}</strong>
                  </span>
                </>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  disabled={togglingOptIn || optInCooldown || changesRemaining <= 0}
                  onClick={handleToggleOptIn}
                  title={
                    changesRemaining <= 0
                      ? "Daily visibility change limit reached. Try again after midnight WIB."
                      : undefined
                  }
                  className={cn(
                    "mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition disabled:opacity-50",
                    optIn
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                      : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
                  )}
                >
                  {togglingOptIn && <RefreshCw className="size-3.5 animate-spin" />}
                  <span>
                    {togglingOptIn
                      ? "Updating…"
                      : changesRemaining <= 0
                        ? optIn
                          ? "Ranked (Locked until 00:00 WIB)"
                          : "Hidden (Locked until 00:00 WIB)"
                        : optIn
                          ? "Show My Ranking: ON"
                          : "Hidden from Rankings: OFF"}
                  </span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void handleAdminForceRefresh()}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-xs font-bold text-primary hover:bg-primary/25 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                  <span>{refreshing ? "Updating Rankings…" : "Refresh Rankings"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter & Metric Controls */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-5">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["distance", "Total Distance", Compass],
                  ["trips", "Total Trips", Flame],
                  ["max_speed", "Peak Speed", Zap],
                  ["avg_speed", "Avg Speed", Gauge],
                ] as const
              ).map(([key, label, Icon]) => {
                const active = metric === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetric(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rider, bike, city…"
                className="w-full rounded-xl border border-border bg-secondary/40 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {optInMessage && (
          <div className="mt-4 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-xs text-foreground">
            {optInMessage}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-2xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-12 text-center space-y-2">
            <Trophy className="size-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No riders match this filter yet.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThree.map((rider, idx) => {
                  const rankNum = idx + 1;
                  const badgeColors =
                    rankNum === 1
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : rankNum === 2
                        ? "border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-200"
                        : "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300";
                  return (
                    <PodiumCard
                      key={rider.user_id}
                      rider={rider}
                      rankNum={rankNum}
                      badgeColors={badgeColors}
                    />
                  );
                })}
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3.5 px-4 w-16">Rank</th>
                      <th className="py-3.5 px-4">Rider</th>
                      <th className="py-3.5 px-4">Primary Machine</th>
                      <th className="py-3.5 px-4 text-right">Distance</th>
                      <th className="py-3.5 px-4 text-right">Trips</th>
                      <th className="py-3.5 px-4 text-right">Ride Time</th>
                      <th className="py-3.5 px-4 text-right">Avg Speed</th>
                      <th className="py-3.5 px-4 text-right">Peak Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {sortedEntries.map((item, idx) => {
                      return (
                        <tr key={item.user_id} className="transition-colors hover:bg-secondary/30">
                          <td className="py-3.5 px-4 font-mono font-black text-xs">
                            <span
                              className={cn(
                                "inline-flex size-7 items-center justify-center rounded-lg border",
                                idx === 0
                                  ? "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : idx === 1
                                    ? "border-slate-400/50 bg-slate-500/15 text-slate-700 dark:text-slate-200"
                                    : idx === 2
                                      ? "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300"
                                      : "border-border bg-secondary/40 text-muted-foreground",
                              )}
                            >
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Link
                              to="/id/$username"
                              params={{ username: item.username }}
                              className="flex items-center gap-3 group"
                            >
                              <RevvAvatar
                                src={item.avatar_url}
                                name={item.display_name}
                                frameCode={item.equipped_frame_code}
                                showVerifiedBadge={item.is_verified_profile}
                                size={36}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 font-display font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  <span className="truncate">{item.display_name}</span>
                                  {item.is_verified_profile && <VerifiedCheckBadge size={15} />}
                                </div>
                                <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2">
                                  <span>@{item.username}</span>
                                  {item.city && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <MapPin className="size-3" />
                                      {item.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {item.primary_bike || "Unlisted Garage"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                            {item.total_distance_km.toFixed(1)} km
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs">
                            {item.total_trips}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground">
                            {formatDurationHours(item.total_duration_seconds)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs">
                            {item.avg_speed_kmh.toFixed(1)} km/h
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-emerald-400">
                            {item.max_speed_kmh.toFixed(0)} km/h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {confirmHideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hide-rank-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2
              id="hide-rank-dialog-title"
              className="font-display text-lg font-black uppercase tracking-tight text-foreground"
            >
              Hide Your Rank from Leaderboard?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Turning this off immediately removes your profile from the public leaderboard across
              Web &amp; Mobile. Turning it back on only updates after{" "}
              <strong className="text-foreground">00:00 WIB</strong> and uses 1 of your daily
              visibility changes ({changesRemaining} left today).
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmHideOpen(false)}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmHideOpen(false);
                  void executeToggleOptIn(false);
                }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                Yes, Hide My Rank
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAuthenticated && <SiteFooter />}
    </div>
  );
}

function PodiumCard({
  rider,
  rankNum,
  badgeColors,
}: {
  rider: LeaderboardEntry;
  rankNum: number;
  badgeColors: string;
}) {
  return (
    <Link
      to="/id/$username"
      params={{ username: rider.username }}
      className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 flex flex-col justify-between gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <RevvAvatar
            src={rider.avatar_url}
            name={rider.display_name}
            frameCode={rider.equipped_frame_code}
            showVerifiedBadge={rider.is_verified_profile}
            size={48}
          />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 font-display text-base font-black text-foreground truncate">
              <span className="truncate">{rider.display_name}</span>
              {rider.is_verified_profile && <VerifiedCheckBadge size={16} />}
            </h3>
            <p className="font-mono text-xs text-muted-foreground truncate">@{rider.username}</p>
            {rider.primary_bike && (
              <p className="font-mono text-[11px] text-primary truncate mt-0.5">
                {rider.primary_bike}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-black",
            badgeColors,
          )}
        >
          <Award className="size-3.5" />#{rankNum}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-3 font-mono">
        <div>
          <span className="text-[10px] text-muted-foreground block">DISTANCE</span>
          <span className="text-sm font-black text-primary">
            {rider.total_distance_km.toFixed(1)} km
          </span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">TRIPS</span>
          <span className="text-sm font-bold text-foreground">{rider.total_trips}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">PEAK SPD</span>
          <span className="text-sm font-bold text-emerald-400">
            {rider.max_speed_kmh.toFixed(0)} km/h
          </span>
        </div>
      </div>
    </Link>
  );
}
