import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  type AdminRiderTripGroup,
  type AdminTripDetailRecord,
  type AdminTripRecordItem,
  fetchAdminTripDetail,
  fetchAdminTrips,
  fetchAdminTripsByRider,
  resolveMediaUrl,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trip-records")({
  head: () => ({
    meta: [
      { title: "Rider Trip Records & Telemetry Inspector — REVV Admin" },
      {
        name: "description",
        content:
          "Administrator trip logbook inspector with recent rides, per-rider expandable trip cards, and interactive GPS map & telemetry modal.",
      },
    ],
  }),
  component: AdminTripRecordsPage,
});

function formatDuration(seconds: number): string {
  const mins = Math.max(0, Math.floor(seconds / 60));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem} min`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminTripRecordsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "administrator";

  const [activeTab, setActiveTab] = useState<"recent" | "riders">("recent");
  const [search, setSearch] = useState("");

  // Tab 1: Top Recent 10 + View More
  const [recentTrips, setRecentTrips] = useState<AdminTripRecordItem[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingMoreRecent, setLoadingMoreRecent] = useState(false);

  // Tab 2: Per Rider Sort ASC Top 10 + View More + Expandable Trip Cards
  const [riderGroups, setRiderGroups] = useState<AdminRiderTripGroup[]>([]);
  const [riderPage, setRiderPage] = useState(1);
  const [riderTotal, setRiderTotal] = useState(0);
  const [riderHasMore, setRiderHasMore] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [loadingMoreRiders, setLoadingMoreRiders] = useState(false);
  const [expandedRiderIds, setExpandedRiderIds] = useState<Record<string, boolean>>({});

  // Detail Modal Popup
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripDetail, setTripDetail] = useState<AdminTripDetailRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(
    async (pageNum: number, append: boolean, queryText: string) => {
      if (append) setLoadingMoreRecent(true);
      else setLoadingRecent(true);
      setError(null);
      try {
        const res = await fetchAdminTrips({
          page: pageNum,
          limit: 10,
          search: queryText,
        });
        setRecentTrips((prev) => (append ? [...prev, ...res.items] : res.items));
        setRecentPage(res.page);
        setRecentTotal(res.total);
        setRecentHasMore(res.has_more);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trip records.");
      } finally {
        setLoadingRecent(false);
        setLoadingMoreRecent(false);
      }
    },
    [],
  );

  const loadRiders = useCallback(
    async (pageNum: number, append: boolean, queryText: string) => {
      if (append) setLoadingMoreRiders(true);
      else setLoadingRiders(true);
      setError(null);
      try {
        const res = await fetchAdminTripsByRider({
          page: pageNum,
          limit: 10,
          search: queryText,
        });
        setRiderGroups((prev) => (append ? [...prev, ...res.items] : res.items));
        setRiderPage(res.page);
        setRiderTotal(res.total);
        setRiderHasMore(res.has_more);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rider trips.");
      } finally {
        setLoadingRiders(false);
        setLoadingMoreRiders(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    if (activeTab === "recent") {
      void loadRecent(1, false, search);
    } else {
      void loadRiders(1, false, search);
    }
  }, [isAuthenticated, isAdmin, activeTab, search, loadRecent, loadRiders]);

  const handleOpenTripDetail = async (tripId: string) => {
    setSelectedTripId(tripId);
    setTripDetail(null);
    setLoadingDetail(true);
    try {
      const detail = await fetchAdminTripDetail(tripId);
      setTripDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trip detail.");
      setSelectedTripId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleExpandRider = (userId: string) => {
    setExpandedRiderIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  if (authLoading) {
    return (
      <div className="p-8">
        <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-8 pt-20 text-center space-y-4">
        <ShieldAlert className="size-12 mx-auto text-destructive" />
        <h1 className="font-display text-2xl font-black uppercase">Administrator Only</h1>
        <p className="text-sm text-muted-foreground">
          You must be signed in with an Administrator account to inspect Rider Trip Records.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase text-primary-foreground"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
            <Compass className="size-3.5" />
            <span>Admin Telemetry Inspector</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Rider Trip Records
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Inspect recent rides across all riders or browse per rider (sorted A–Z) with
            expandable trip cards and interactive GPS map telemetry.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            activeTab === "recent"
              ? void loadRecent(1, false, search)
              : void loadRiders(1, false, search)
          }
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-secondary/50 px-4 py-2.5 font-mono text-xs font-bold uppercase hover:bg-secondary"
        >
          <RefreshCw className="size-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("recent")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition",
              activeTab === "recent"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="size-3.5" />
            <span>Top Recent Trips ({recentTotal})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("riders")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition",
              activeTab === "riders"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="size-3.5" />
            <span>Per Rider • Sort ASC ({riderTotal || "A–Z"})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rider, trip title, origin/dest…"
            className="w-full rounded-xl border border-border bg-secondary/40 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* TAB 1: TOP RECENT TRIPS (10 PER PAGE + VIEW MORE) */}
      {activeTab === "recent" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loadingRecent ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-xl bg-secondary/40 animate-pulse"
                />
              ))}
            </div>
          ) : recentTrips.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No recorded trips found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3.5 px-4">Rider</th>
                      <th className="py-3.5 px-4">Trip &amp; Route</th>
                      <th className="py-3.5 px-4 text-right">Distance</th>
                      <th className="py-3.5 px-4 text-right">Duration</th>
                      <th className="py-3.5 px-4 text-right">Avg / Peak Spd</th>
                      <th className="py-3.5 px-4 text-right">Max Lean</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {recentTrips.map((trip) => {
                      const avatar = resolveMediaUrl(trip.avatar_url);
                      return (
                        <tr
                          key={trip.id}
                          onClick={() => void handleOpenTripDetail(trip.id)}
                          className="cursor-pointer transition-colors hover:bg-secondary/30"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={trip.display_name}
                                  className="size-8 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary font-mono text-xs font-bold">
                                  {trip.display_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-foreground">
                                  {trip.display_name}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  @{trip.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-display font-bold text-foreground truncate">
                              {trip.title}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground truncate">
                              {trip.origin_name || "Start"} &rarr;{" "}
                              {trip.destination_name || "Finish"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                            {trip.total_distance_km.toFixed(2)} km
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {formatDuration(trip.total_duration_seconds)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span>{trip.avg_speed_kmh.toFixed(1)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="font-bold text-emerald-400">
                              {trip.max_speed_kmh.toFixed(0)} km/h
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {trip.max_lean_deg > 0
                                ? `${trip.max_lean_deg.toFixed(0)}°`
                                : "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                            {formatDateTime(trip.start_time)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenTripDetail(trip.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-primary hover:bg-primary/20"
                            >
                              <Eye className="size-3.5" />
                              <span>Map &amp; Detail</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {recentHasMore && (
                <div className="p-4 border-t border-border bg-secondary/20 text-center">
                  <button
                    type="button"
                    disabled={loadingMoreRecent}
                    onClick={() => void loadRecent(recentPage + 1, true, search)}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-6 py-2.5 font-mono text-xs font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-50"
                  >
                    {loadingMoreRecent ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Loading More…</span>
                      </>
                    ) : (
                      <span>
                        View More ({recentTrips.length} of {recentTotal})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: PER RIDER (SORTED ASC TOP 10 + VIEW MORE + EXPANDABLE TRIP CARDS) */}
      {activeTab === "riders" && (
        <div className="space-y-3">
          {loadingRiders ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-2xl border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : riderGroups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No riders with recorded trips found.
            </div>
          ) : (
            <>
              {riderGroups.map((group) => {
                const expanded = Boolean(expandedRiderIds[group.user_id]);
                const avatar = resolveMediaUrl(group.avatar_url);
                return (
                  <div
                    key={group.user_id}
                    className="rounded-2xl border border-border bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandRider(group.user_id)}
                      className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:bg-secondary/25 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        {expanded ? (
                          <ChevronDown className="size-5 text-primary shrink-0" />
                        ) : (
                          <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                        )}
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={group.display_name}
                            className="size-11 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary font-mono text-sm font-black">
                            {group.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-display text-base font-black text-foreground">
                            {group.display_name}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            @{group.username} • Last ride:{" "}
                            {formatDateTime(group.last_trip_at)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 sm:gap-6 font-mono text-xs bg-secondary/40 rounded-xl px-4 py-2.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">
                            TRIPS
                          </span>
                          <span className="font-black text-foreground">
                            {group.total_trips}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">
                            DISTANCE
                          </span>
                          <span className="font-black text-primary">
                            {group.total_distance_km.toFixed(1)} km
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">
                            AVG SPD
                          </span>
                          <span className="font-bold text-foreground">
                            {group.avg_speed_kmh.toFixed(1)} km/h
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">
                            PEAK SPD
                          </span>
                          <span className="font-bold text-emerald-400">
                            {group.max_speed_kmh.toFixed(0)} km/h
                          </span>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-border bg-secondary/15 p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between font-mono text-xs text-muted-foreground">
                          <span>
                            SHOWING {group.trips.length} RECORDED TRIPS — CLICK A CARD TO
                            INSPECT MAP &amp; TELEMETRY
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {group.trips.map((trip) => (
                            <div
                              key={trip.id}
                              onClick={() => void handleOpenTripDetail(trip.id)}
                              className="cursor-pointer rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-md flex flex-col justify-between gap-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-display text-sm font-black text-foreground line-clamp-1">
                                    {trip.title}
                                  </h4>
                                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary shrink-0">
                                    {trip.total_distance_km.toFixed(2)} km
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                                  <MapPin className="size-3.5 text-primary shrink-0" />
                                  <span className="truncate">
                                    {trip.origin_name || "Start Point"} &rarr;{" "}
                                    {trip.destination_name || "Finish Point"}
                                  </span>
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {formatDateTime(trip.start_time)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-border/60 pt-2.5 font-mono text-[11px]">
                                <span>
                                  {formatDuration(trip.total_duration_seconds)} • Avg{" "}
                                  {trip.avg_speed_kmh.toFixed(0)} km/h
                                </span>
                                <span className="text-primary font-bold inline-flex items-center gap-1">
                                  <Eye className="size-3" />
                                  Map &amp; Metrics
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {riderHasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={loadingMoreRiders}
                    onClick={() => void loadRiders(riderPage + 1, true, search)}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-6 py-2.5 font-mono text-xs font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-50"
                  >
                    {loadingMoreRiders ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Loading More Riders…</span>
                      </>
                    ) : (
                      <span>
                        View More Riders ({riderGroups.length} of {riderTotal})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TRIP DETAIL MODAL POPUP WITH INTERACTIVE MAP VIEW & METRICS */}
      {selectedTripId && (
        <TripDetailModal
          detail={tripDetail}
          loading={loadingDetail}
          onClose={() => {
            setSelectedTripId(null);
            setTripDetail(null);
          }}
        />
      )}
    </div>
  );
}

interface LatLngPoint {
  lat: number;
  lng: number;
  speed?: number | undefined;
}

function parsePolylinePoints(raw: unknown, telemetry?: Record<string, unknown>): LatLngPoint[] {
  const out: LatLngPoint[] = [];
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(telemetry?.["route_points"])
      ? (telemetry?.["route_points"] as unknown[])
      : [];
  for (const pt of source) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = Number(pt[0]);
      const lng = Number(pt[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        out.push({ lat, lng });
      }
    } else if (pt && typeof pt === "object") {
      const obj = pt as Record<string, unknown>;
      const lat = Number(obj["lat"] ?? obj["latitude"]);
      const lng = Number(obj["lng"] ?? obj["lon"] ?? obj["longitude"]);
      const speed = Number(obj["speed_kmh"] ?? obj["speedKmh"] ?? obj["speed"]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        out.push({
          lat,
          lng,
          speed: Number.isFinite(speed) ? speed : undefined,
        });
      }
    }
  }
  return out;
}

function TripDetailModal({
  detail,
  loading,
  onClose,
}: {
  detail: AdminTripDetailRecord | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = useMemo(
    () => (detail ? parsePolylinePoints(detail.polyline_points, detail.telemetry_data) : []),
    [detail],
  );

  const mapProjection = useMemo(() => {
    const firstPt = points[0];
    if (!firstPt || points.length < 2) return null;
    let minLat = firstPt.lat;
    let maxLat = firstPt.lat;
    let minLng = firstPt.lng;
    let maxLng = firstPt.lng;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latSpan = Math.max(0.002, (maxLat - minLat) * 1.25);
    const lngSpan = Math.max(0.002, (maxLng - minLng) * 1.25);
    const span = Math.max(latSpan, lngSpan);
    const zoom = Math.max(
      5,
      Math.min(16, Math.floor(Math.log2(360 / span)) + 1),
    );

    const w = 720;
    const h = 380;
    const pad = 36;
    const toSvg = (lat: number, lng: number) => {
      const x = pad + ((lng - (centerLng - span / 2)) / span) * (w - pad * 2);
      const y = h - pad - ((lat - (centerLat - span / 2)) / span) * (h - pad * 2);
      return { x, y };
    };

    // Compute background OSM tile coordinates at center
    const n = 2 ** zoom;
    const centerTileX = Math.floor(((centerLng + 180) / 360) * n);
    const latRad = (centerLat * Math.PI) / 180;
    const centerTileY = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    );

    const svgPoints = points.map((p) => toSvg(p.lat, p.lng));
    const startSvg = svgPoints[0] ?? { x: pad, y: pad };
    const endSvg = svgPoints[svgPoints.length - 1] ?? startSvg;
    const pathD = svgPoints
      .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(" ");

    return {
      w,
      h,
      zoom,
      centerTileX,
      centerTileY,
      svgPoints,
      startSvg,
      endSvg,
      pathD,
    };
  }, [points]);

  const telemetry = detail?.telemetry_data ?? {};
  const originName = String(
    telemetry["origin_name"] || telemetry["start_address"] || "Recorded Start Point",
  );
  const destName = String(
    telemetry["destination_name"] || telemetry["end_address"] || detail?.title || "Destination",
  );
  const leanObj = telemetry["lean_angle"] as Record<string, unknown> | undefined;
  const maxLean = Number(
    telemetry["max_lean_deg"] ?? leanObj?.["max_lean_deg"] ?? 0,
  );
  const maxLeanLeft = Number(leanObj?.["max_lean_left_deg"] ?? 0);
  const maxLeanRight = Number(leanObj?.["max_lean_right_deg"] ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-md">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              TRIP TELEMETRY &amp; GPS ROUTE INSPECTOR
            </span>
            <h3 className="font-display text-lg font-black text-foreground">
              {detail?.title || "Loading Trip…"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-secondary/50 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="p-8 space-y-4">
            <div className="h-72 rounded-2xl bg-secondary/40 animate-pulse" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Interactive Map View */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[#0c1017]">
              {mapProjection ? (
                <div className="relative">
                  {/* Subtle Dark OSM Tile Grid Background */}
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-2 opacity-30 invert hue-rotate-180 contrast-125">
                    {[-1, 0, 1].map((dy) =>
                      [-1, 0, 1].map((dx) => (
                        <img
                          key={`${dx}_${dy}`}
                          src={`https://tile.openstreetmap.org/${mapProjection.zoom}/${mapProjection.centerTileX + dx}/${mapProjection.centerTileY + dy}.png`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )),
                    )}
                  </div>

                  <svg
                    viewBox={`0 0 ${mapProjection.w} ${mapProjection.h}`}
                    className="relative z-10 w-full h-72 sm:h-80"
                  >
                    {/* Route outer glow */}
                    <path
                      d={mapProjection.pathD}
                      fill="none"
                      stroke="rgba(225, 29, 72, 0.32)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Route core line */}
                    <path
                      d={mapProjection.pathD}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Start marker (Green) */}
                    <circle
                      cx={mapProjection.startSvg.x}
                      cy={mapProjection.startSvg.y}
                      r="7"
                      fill="#22C55E"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    {/* End marker (Red) */}
                    <circle
                      cx={mapProjection.endSvg.x}
                      cy={mapProjection.endSvg.y}
                      r="8"
                      fill="#E11D48"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    {/* Interactive scrubbed point */}
                    {hoverIdx !== null && mapProjection.svgPoints[hoverIdx] && (
                      <circle
                        cx={mapProjection.svgPoints[hoverIdx].x}
                        cy={mapProjection.svgPoints[hoverIdx].y}
                        r="7"
                        fill="#38BDF8"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                      />
                    )}
                  </svg>

                  {/* Route Scrubber Bar */}
                  <div className="relative z-20 flex items-center gap-3 border-t border-border/60 bg-background/90 px-4 py-2.5 font-mono text-xs">
                    <span className="text-emerald-400 font-bold">START</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, points.length - 1)}
                      value={hoverIdx ?? points.length - 1}
                      onChange={(e) => setHoverIdx(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-primary font-bold">FINISH</span>
                    <span className="text-muted-foreground">
                      ({points.length} GPS pts)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Navigation className="size-8 opacity-40" />
                  <p className="font-mono text-xs">
                    No polyline coordinates stored for this trip.
                  </p>
                </div>
              )}
            </div>

            {/* Rider & Route Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">RIDER</span>
                <div className="font-display text-sm font-black text-foreground">
                  {detail.display_name} (@{detail.username})
                </div>
                <div className="text-muted-foreground">
                  Started: {formatDateTime(detail.start_time)}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">
                  ORIGIN &rarr; DESTINATION
                </span>
                <div className="text-foreground font-semibold truncate">
                  {originName}
                </div>
                <div className="text-primary font-bold truncate">
                  &rarr; {destName}
                </div>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono">
              <MetricBox
                icon={Compass}
                label="DISTANCE"
                value={`${detail.total_distance_km.toFixed(2)} km`}
                accent="text-primary"
              />
              <MetricBox
                icon={Clock}
                label="DURATION"
                value={formatDuration(detail.total_duration_seconds)}
                accent="text-sky-400"
              />
              <MetricBox
                icon={Gauge}
                label="AVG SPEED"
                value={`${detail.avg_speed_kmh.toFixed(1)} km/h`}
                accent="text-amber-400"
              />
              <MetricBox
                icon={Zap}
                label="MAX SPEED"
                value={`${detail.max_speed_kmh.toFixed(0)} km/h`}
                accent="text-emerald-400"
              />
              <MetricBox
                icon={Navigation}
                label="MAX LEAN"
                value={
                  maxLean > 0
                    ? `${maxLean.toFixed(0)}° (L${maxLeanLeft.toFixed(0)}°/R${maxLeanRight.toFixed(0)}°)`
                    : "0°"
                }
                accent="text-purple-400"
              />
              <MetricBox
                icon={MapPin}
                label="VISIBILITY"
                value={detail.visibility.toUpperCase()}
                accent="text-rose-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <Icon className={cn("size-3.5", accent)} />
      </div>
      <div className={cn("text-sm font-black truncate", accent)}>{value}</div>
    </div>
  );
}
