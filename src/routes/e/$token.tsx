import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { resolveMediaUrl } from "@/lib/api";
import {
  fetchPublicSharedEvent,
  type PublicSharedEventResponse,
} from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/e/$token")({
  head: () => ({
    meta: [
      { title: "Shared Club Event — REVV" },
      {
        name: "description",
        content: "View club riding event itinerary, stops, and rider roster on REVV.",
      },
    ],
  }),
  component: SharedEventPage,
});

type RsvpTab = "going" | "tentative" | "not_going";

function formatEventDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stopMapsHref(lat?: number | null, lng?: number | null, query?: string | null): string | null {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (query && query.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
  }
  return null;
}

function SharedEventPage() {
  const { token } = Route.useParams();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<PublicSharedEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<RsvpTab>("going");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (status: RsvpTab, nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublicSharedEvent(token, {
          status,
          page: nextPage,
          limit: 10,
        });
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared event.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(tab, page);
  }, [load, tab, page]);

  const handleSelectTab = (next: RsvpTab) => {
    setTab(next);
    setPage(1);
  };

  const event = data?.event;
  const participants = data?.participants;
  const totalPages = participants
    ? Math.max(1, Math.ceil(participants.total / Math.max(1, participants.limit)))
    : 1;
  const coverUrl = event?.cover_image_url ? resolveMediaUrl(event.cover_image_url) : undefined;
  const clubAvatarUrl = event?.community_avatar_url
    ? resolveMediaUrl(event.community_avatar_url)
    : undefined;
  const stops = Array.isArray(event?.stops) ? event.stops : [];

  const firstStopCoords =
    stops.find((s) => typeof s.latitude === "number" && typeof s.longitude === "number") ??
    (event && typeof event.latitude === "number" && typeof event.longitude === "number"
      ? { name: event.location_name || event.title, latitude: event.latitude, longitude: event.longitude }
      : null);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main
        className={cn(
          "flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 pb-16",
          isAuthenticated ? "pt-8" : "pt-28",
        )}
      >
        {loading && !data ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Loading event details...
          </div>
        ) : error || !event ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
              <CalendarX2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Event View Link Unavailable or Expired
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error ||
                "This public event view link is either disabled, expired (H+3 after the event date), or has not been shared."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
            >
              Back to REVV
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero / Summary Card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              {coverUrl ? (
                <div className="relative h-52 w-full bg-zinc-900">
                  <img
                    src={coverUrl}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-rose-950/60 via-zinc-900 to-zinc-950 border-b border-border">
                  <div className="flex flex-col items-center gap-2 text-rose-400/80">
                    <Calendar className="h-10 w-10" />
                    <span className="text-xs font-semibold uppercase tracking-widest">
                      Club Riding Event
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    {clubAvatarUrl && (
                      <img
                        src={clubAvatarUrl}
                        alt={event.community_name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    )}
                    <span>{event.community_name}</span>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                      event.lifecycle_state === "cancelled"
                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                        : event.lifecycle_state === "past"
                          ? "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                    )}
                  >
                    {event.lifecycle_state}
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {event.title}
                  </h1>
                  {event.description && (
                    <p className="mt-2 text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm">
                    <Calendar className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="font-medium truncate">
                      {formatEventDate(event.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm">
                    <Clock className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="font-medium">
                      {formatEventTime(event.start_time)} ({event.duration_minutes} min)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm">
                    <MapPin className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="font-medium truncate">
                      {event.location_name || stops[0]?.name || "Route checkpoints below"}
                    </span>
                  </div>
                </div>

                {data?.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Public view link valid until{" "}
                    <span className="font-semibold text-foreground">
                      {formatEventDate(data.expires_at)} • {formatEventTime(data.expires_at)}
                    </span>{" "}
                    (H+3 after event)
                  </p>
                )}
              </div>
            </div>

            {/* Route Preview & Multi-Stop Itinerary */}
            {(stops.length > 0 || firstStopCoords) && (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-rose-400" />
                    <div>
                      <h2 className="text-base font-bold">Rute &amp; Destinasi</h2>
                      <p className="text-xs text-muted-foreground">
                        {stops.length > 0
                          ? `${stops.length} Titik Pemberhentian`
                          : "Lokasi Event"}
                      </p>
                    </div>
                  </div>
                  {firstStopCoords?.latitude != null && firstStopCoords?.longitude != null && (
                    <a
                      href={
                        stopMapsHref(
                          firstStopCoords.latitude,
                          firstStopCoords.longitude,
                          firstStopCoords.name,
                        ) ?? "#"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                    >
                      Open in Maps <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {stops.length > 0 && (
                  <div className="space-y-3">
                    {stops.map((stop, idx) => {
                      const letter = String.fromCharCode(65 + (idx % 26));
                      const href = stopMapsHref(stop.latitude, stop.longitude, stop.address || stop.name);
                      return (
                        <div
                          key={`${stop.name}-${idx}`}
                          className="flex items-start gap-3.5 rounded-xl border border-border bg-background/60 p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-extrabold text-white">
                            {letter}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {stop.time && (
                                  <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300">
                                    {stop.time}
                                  </span>
                                )}
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {stop.label ||
                                    (idx === 0
                                      ? "Titik Kumpul Awal"
                                      : idx === stops.length - 1
                                        ? "Finish / Tujuan Akhir"
                                        : `Checkpoint #${idx + 1}`)}
                                </span>
                              </div>
                              {href && (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-rose-500/40 transition"
                                >
                                  Maps <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <div className="font-bold text-sm sm:text-base">{stop.name}</div>
                            {stop.address && (
                              <div className="text-xs text-muted-foreground">{stop.address}</div>
                            )}
                            {stop.notes && (
                              <div className="text-xs text-zinc-400 pt-0.5">{stop.notes}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* List Riders */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-rose-400" />
                  <h2 className="text-base font-bold">List Riders</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  Total{" "}
                  {(participants?.going_count ?? event.going_count) +
                    (participants?.tentative_count ?? event.tentative_count) +
                    (participants?.not_going_count ?? event.not_going_count)}{" "}
                  konfirmasi
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-background/70 p-1 border border-border">
                {(
                  [
                    {
                      id: "going",
                      label: `Ikut (${participants?.going_count ?? event.going_count})`,
                    },
                    {
                      id: "tentative",
                      label: `Tentative (${participants?.tentative_count ?? event.tentative_count})`,
                    },
                    {
                      id: "not_going",
                      label: `Gak Ikut (${participants?.not_going_count ?? event.not_going_count})`,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition",
                      tab === item.id
                        ? "bg-rose-600 text-white shadow"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading participants...
                </div>
              ) : !participants || participants.items.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada rider di daftar ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {participants.items.map((p, idx) => {
                    const rowNumber = (participants.page - 1) * participants.limit + idx + 1;
                    const avatar = p.avatar_url ? resolveMediaUrl(p.avatar_url) : undefined;
                    return (
                      <div
                        key={`${p.username}-${p.created_at}-${idx}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3.5 py-2.5"
                      >
                        <span className="w-6 text-xs font-bold text-muted-foreground">
                          {rowNumber}.
                        </span>
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={p.display_name}
                            className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-extrabold text-rose-300">
                            {(p.display_name || "R").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">{p.display_name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {p.motorcycle_name || `@${p.username}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted transition"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted transition"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {!isAuthenticated && <SiteFooter />}
    </div>
  );
}
