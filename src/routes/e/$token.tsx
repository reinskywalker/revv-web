import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { AppOpenBanner } from "@/components/revv/AppOpenBanner";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { resolveMediaUrl } from "@/lib/api";
import {
  SharedEventError,
  fetchPublicSharedEvent,
  rsvpCommunityEvent,
  type PublicSharedEventResponse,
  type PublicSharedEventStop,
} from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type RsvpTab = "going" | "tentative" | "not_going";

export const Route = createFileRoute("/e/$token")({
  loader: async ({ params }) => {
    try {
      const initialData = await fetchPublicSharedEvent(params.token, {
        status: "going",
        page: 1,
        limit: 10,
      });
      return {
        initialData,
        initialError: null as { message: string; isNotFound: boolean } | null,
      };
    } catch (err) {
      if (err instanceof SharedEventError) {
        return {
          initialData: null as PublicSharedEventResponse | null,
          initialError: { message: err.message, isNotFound: err.isNotFound },
        };
      }
      return {
        initialData: null as PublicSharedEventResponse | null,
        initialError: {
          message:
            err instanceof Error
              ? err.message
              : "Unable to load event details right now. Please try again.",
          isNotFound: false,
        },
      };
    }
  },
  component: PublicSharedEventPage,
});

function formatEventDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatEventTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "Flexible";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

function stopMapsUrl(stop: PublicSharedEventStop): string | null {
  if (stop.latitude != null && stop.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
  }
  const query = [stop.name, stop.address].filter(Boolean).join(", ").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function PublicSharedEventPage() {
  const { token } = Route.useParams();
  const { initialData, initialError } = Route.useLoaderData();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<PublicSharedEventResponse | null>(initialData);
  const [fatalError, setFatalError] = useState<{
    message: string;
    isNotFound: boolean;
  } | null>(initialData ? null : initialError);
  const [tabError, setTabError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [tabLoading, setTabLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<RsvpTab>("going");
  const [page, setPage] = useState(1);
  const [rsvpSubmitting, setRsvpSubmitting] = useState<RsvpTab | null>(null);
  const [rsvpNotice, setRsvpNotice] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
    setFatalError(initialData ? null : initialError);
    setTabError(null);
    setActiveTab("going");
    setPage(1);
  }, [token, initialData, initialError]);

  const loadSharedEvent = useCallback(
    async (tab: RsvpTab, nextPage: number, background: boolean) => {
      if (background) {
        setTabLoading(true);
      } else {
        setLoading(true);
      }
      setTabError(null);
      try {
        const res = await fetchPublicSharedEvent(token, {
          status: tab,
          page: nextPage,
          limit: 10,
        });
        setData(res);
        setFatalError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load event details right now.";
        const isNotFound = err instanceof SharedEventError ? err.isNotFound : false;
        if (background && data) {
          setTabError(message);
        } else {
          setFatalError({ message, isNotFound });
        }
      } finally {
        setLoading(false);
        setTabLoading(false);
      }
    },
    [token, data],
  );

  // If SSR failed transiently with no data, try fetching on client once
  useEffect(() => {
    if (!data && fatalError && !fatalError.isNotFound) {
      void loadSharedEvent(activeTab, page, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSelectTab = (tab: RsvpTab) => {
    setActiveTab(tab);
    setPage(1);
    void loadSharedEvent(tab, 1, Boolean(data));
  };

  const handleChangePage = (nextPage: number) => {
    setPage(nextPage);
    void loadSharedEvent(activeTab, nextPage, Boolean(data));
  };

  const handleRsvp = async (status: RsvpTab) => {
    if (!data || !isAuthenticated) return;
    setRsvpSubmitting(status);
    setRsvpNotice(null);
    try {
      await rsvpCommunityEvent(data.event.id, status);
      setRsvpNotice("Your RSVP has been updated.");
      await loadSharedEvent(activeTab, page, true);
    } catch (err) {
      setTabError(err instanceof Error ? err.message : "Could not update RSVP.");
    } finally {
      setRsvpSubmitting(null);
    }
  };

  const ev = data?.event;
  const participants = data?.participants;
  const totalPages = participants
    ? Math.max(1, Math.ceil(participants.total / Math.max(1, participants.limit)))
    : 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <AppOpenBanner
          deepLinkPath={`e/${token}`}
          title="Open this event in REVV"
          subtitle="Track live meetup points, join club ride sessions, and RSVP directly from the mobile app."
        />

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-base font-medium text-foreground">Loading shared event...</p>
          </div>
        ) : fatalError && !data ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              {fatalError.isNotFound ? (
                <ShieldAlert className="h-7 w-7" />
              ) : (
                <AlertTriangle className="h-7 w-7" />
              )}
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              {fatalError.isNotFound
                ? "Event View Link Unavailable or Expired"
                : "Temporarily Unable to Load Event"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
              {fatalError.isNotFound
                ? fatalError.message
                : `${fatalError.message} Please check your connection and try again.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!fatalError.isNotFound && (
                <button
                  type="button"
                  onClick={() => void loadSharedEvent(activeTab, page, false)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              )}
              <Link
                to="/clubs"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-secondary/70 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Explore Clubs
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : ev && participants ? (
          <div className="space-y-6">
            {/* Hero / Event Summary Card */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              {ev.cover_image_url ? (
                <div className="relative h-56 w-full bg-secondary sm:h-72">
                  <img
                    src={resolveMediaUrl(ev.cover_image_url) || ""}
                    alt={ev.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                </div>
              ) : ev.community_banner_url ? (
                <div className="relative h-44 w-full bg-secondary sm:h-52">
                  <img
                    src={resolveMediaUrl(ev.community_banner_url) || ""}
                    alt={ev.community_name}
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                </div>
              ) : null}

              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to="/clubs/$id"
                    params={{ id: ev.community_id }}
                    className="inline-flex items-center gap-2.5 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    {ev.community_avatar_url ? (
                      <img
                        src={resolveMediaUrl(ev.community_avatar_url) || ""}
                        alt={ev.community_name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                    <span>{ev.community_name}</span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                        ev.status === "cancelled" || ev.lifecycle_state === "cancelled"
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : ev.lifecycle_state === "ongoing"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : ev.lifecycle_state === "past"
                              ? "border-zinc-500/40 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300"
                              : "border-primary/40 bg-primary/15 text-primary",
                      )}
                    >
                      {ev.status === "cancelled"
                        ? "Cancelled"
                        : ev.lifecycle_state === "ongoing"
                          ? "Ongoing"
                          : ev.lifecycle_state === "past"
                            ? "Past Event"
                            : "Upcoming"}
                    </span>
                  </div>
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {ev.title}
                </h1>

                {ev.description && (
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/85">
                    {ev.description}
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-background/60 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      Date
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {formatEventDate(ev.start_time)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-background/60 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      Start & Duration
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {formatEventTime(ev.start_time)} · {formatDuration(ev.duration_minutes)}
                    </p>
                    {ev.route_distance_meters != null && ev.route_distance_meters > 0 && (
                      <p className="mt-1 text-xs font-mono text-primary">
                        Route: {(ev.route_distance_meters / 1000).toFixed(1)} km
                        {ev.route_duration_seconds != null && ev.route_duration_seconds > 0
                          ? ` (~${Math.max(1, Math.round(ev.route_duration_seconds / 60))} min)`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-background/60 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-foreground line-clamp-2">
                      {ev.location_name || ev.stops[0]?.name || "See route stops"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-background/60 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Hosted By
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {ev.creator_name}
                    </p>
                  </div>
                </div>

                {/* RSVP Strip */}
                <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Confirm your attendance</p>
                    <p className="text-xs text-muted-foreground">
                      {isAuthenticated
                        ? "Tap an option below to update your RSVP with the club."
                        : "Sign in to confirm your attendance directly from the web."}
                    </p>
                  </div>
                  {isAuthenticated ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={rsvpSubmitting !== null || ev.status === "cancelled"}
                        onClick={() => void handleRsvp("going")}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Going
                      </button>
                      <button
                        type="button"
                        disabled={rsvpSubmitting !== null || ev.status === "cancelled"}
                        onClick={() => void handleRsvp("tentative")}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-60"
                      >
                        <HelpCircle className="h-4 w-4" />
                        Maybe
                      </button>
                      <button
                        type="button"
                        disabled={rsvpSubmitting !== null || ev.status === "cancelled"}
                        onClick={() => void handleRsvp("not_going")}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Can't Go
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Sign In to RSVP
                    </Link>
                  )}
                </div>

                {rsvpNotice && (
                  <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {rsvpNotice}
                  </p>
                )}
              </div>
            </section>

            {/* Route & Meetup Stops */}
            {ev.stops && ev.stops.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Route & Stops</h2>
                    <p className="text-sm text-muted-foreground">
                      {ev.stops.length} {ev.stops.length === 1 ? "stop" : "stops"} planned
                    </p>
                  </div>
                </div>

                <ol className="mt-5 space-y-4">
                  {ev.stops.map((stop, idx) => {
                    const mapsHref = stopMapsUrl(stop);
                    const isFirst = idx === 0;
                    const isLast = idx === ev.stops.length - 1;
                    return (
                      <li
                        key={`${idx}-${stop.name}`}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                              isFirst
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                                : isLast
                                  ? "bg-primary/20 text-primary border border-primary/40"
                                  : "bg-secondary text-foreground border border-border",
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {stop.time && (
                                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                                  {stop.time}
                                </span>
                              )}
                              {stop.label && (
                                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-foreground/85">
                                  {stop.label}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-1.5 text-base font-semibold text-foreground">
                              {stop.name}
                            </h3>
                            {stop.address && (
                              <p className="mt-0.5 text-sm text-muted-foreground">{stop.address}</p>
                            )}
                            {stop.notes && (
                              <p className="mt-1 text-sm text-foreground/80">{stop.notes}</p>
                            )}
                          </div>
                        </div>

                        {mapsHref && (
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 self-start rounded-xl border border-primary/35 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Open in Maps
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Participants List */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Participants</h2>
                  <p className="text-sm text-muted-foreground">
                    Live RSVP roster (
                    {participants.going_count +
                      participants.tentative_count +
                      participants.not_going_count}{" "}
                    responses)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "going", label: "Going", count: participants.going_count },
                      { key: "tentative", label: "Maybe", count: participants.tentative_count },
                      { key: "not_going", label: "Can't Go", count: participants.not_going_count },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectTab(item.key)}
                      className={cn(
                        "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                        activeTab === item.key
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-xs">
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {tabError && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  <span>{tabError}</span>
                  <button
                    type="button"
                    onClick={() => void loadSharedEvent(activeTab, page, true)}
                    className="font-semibold underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="relative mt-5">
                {tabLoading && (
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Refreshing participant list...
                  </div>
                )}

                {participants.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/50 p-8 text-center text-sm text-muted-foreground">
                    No riders in this list yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border bg-background/40">
                    {participants.items.map((p, idx) => (
                      <li
                        key={`${p.username}-${idx}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.avatar_url ? (
                            <img
                              src={resolveMediaUrl(p.avatar_url) || ""}
                              alt={p.display_name}
                              className="h-10 w-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                              {(p.display_name || p.username || "R").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p.display_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{p.username}
                              {p.motorcycle_name ? ` · ${p.motorcycle_name}` : ""}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || tabLoading}
                        onClick={() => handleChangePage(page - 1)}
                        className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || tabLoading}
                        onClick={() => handleChangePage(page + 1)}
                        className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
