import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Gauge,
  LifeBuoy,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { SupportDeskPanel } from "@/components/rides/SupportDeskPanel";
import {
  deleteMyTrip,
  fetchCommunities,
  fetchCommunityEvents,
  fetchMyTrips,
  joinCommunity,
  leaveCommunity,
  rsvpCommunityEvent,
  type CommunityEventItem,
  type CommunitySummary,
  type RideTripSummary,
} from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/date";

export const Route = createFileRoute("/rides")({
  head: () => ({
    meta: [{ title: "Rides, Clubs & Support — REVV" }],
  }),
  component: RidesHubPage,
});

type RidesTab = "communities" | "events" | "trips" | "support";

function RidesHubPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<RidesTab>("communities");

  // Communities
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [clubSearch, setClubSearch] = useState("");
  const [joinedOnly, setJoinedOnly] = useState(false);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);
  const [busyClubId, setBusyClubId] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<CommunityEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  // Trips
  const [trips, setTrips] = useState<RideTripSummary[]>([]);
  const [tripsPage, setTripsPage] = useState(1);
  const [tripsTotalPages, setTripsTotalPages] = useState(1);
  const [tripQuery, setTripQuery] = useState("");
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [deleteTripTarget, setDeleteTripTarget] = useState<RideTripSummary | null>(null);
  const [deleteTripBusy, setDeleteTripBusy] = useState(false);

  const loadCommunities = useCallback(async () => {
    setClubLoading(true);
    setClubError(null);
    try {
      const data = await fetchCommunities({ search: clubSearch, joined_only: joinedOnly });
      setCommunities(data);
    } catch (err) {
      setClubError(err instanceof Error ? err.message : "Failed to load communities.");
    } finally {
      setClubLoading(false);
    }
  }, [clubSearch, joinedOnly]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await fetchCommunityEvents();
      setEvents(data);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load ride events.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    setTripsError(null);
    try {
      const res = await fetchMyTrips({ page: tripsPage, limit: 10, q: tripQuery });
      setTrips(res.trips);
      setTripsTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      setTripsError(err instanceof Error ? err.message : "Failed to load trips.");
    } finally {
      setTripsLoading(false);
    }
  }, [tripsPage, tripQuery]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "communities") void loadCommunities();
    if (tab === "events") void loadEvents();
    if (tab === "trips") void loadTrips();
  }, [isAuthenticated, tab, loadCommunities, loadEvents, loadTrips]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-48 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <Compass className="size-10 mx-auto text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Rider Operations Hub</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to explore riding clubs, RSVP to group rides, review your telemetry trips, or
          contact rider support.
        </p>
        <Link
          to="/login"
          className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6"
        >
          Sign In
        </Link>
      </div>
    );
  }

  async function toggleMembership(club: CommunitySummary) {
    setBusyClubId(club.id);
    setClubError(null);
    try {
      if (club.my_status === "approved" || club.my_status === "joined") {
        await leaveCommunity(club.id);
      } else {
        await joinCommunity(club.id);
      }
      await loadCommunities();
    } catch (err) {
      setClubError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setBusyClubId(null);
    }
  }

  async function handleRsvp(eventId: string, status: "going" | "interested" | "not_going") {
    setBusyEventId(eventId);
    setEventsError(null);
    try {
      await rsvpCommunityEvent(eventId, status);
      await loadEvents();
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to update RSVP.");
    } finally {
      setBusyEventId(null);
    }
  }

  async function confirmDeleteTrip() {
    if (!deleteTripTarget) return;
    setDeleteTripBusy(true);
    try {
      await deleteMyTrip(deleteTripTarget.id);
      setDeleteTripTarget(null);
      await loadTrips();
    } catch (err) {
      setTripsError(err instanceof Error ? err.message : "Failed to delete trip.");
    } finally {
      setDeleteTripBusy(false);
    }
  }

  const tabs: Array<{ id: RidesTab; label: string; icon: typeof Users }> = [
    { id: "communities", label: "Communities", icon: Users },
    { id: "events", label: "Ride Events", icon: Calendar },
    { id: "trips", label: "Trip History", icon: Navigation },
    { id: "support", label: "Support Desk", icon: LifeBuoy },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-primary">
            Cockpit Parity Hub
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Rides, Clubs & Support
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {tab === "communities" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-3.5" />
              <input
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Search riding communities…"
                className="w-full min-h-[44px] rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => setJoinedOnly((v) => !v)}
              className={`min-h-[44px] rounded-full border px-4 text-xs font-semibold ${
                joinedOnly
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {joinedOnly ? "Showing Joined Only" : "All Clubs"}
            </button>
          </div>

          {clubError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between gap-3">
              <span className="text-xs text-destructive">{clubError}</span>
              <button
                type="button"
                onClick={() => void loadCommunities()}
                className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
              >
                <RefreshCw className="size-3.5 inline mr-1" /> Retry
              </button>
            </div>
          )}

          {clubLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 rounded-2xl border border-border bg-card animate-pulse" />
              <div className="h-36 rounded-2xl border border-border bg-card animate-pulse" />
            </div>
          ) : communities.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No communities match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communities.map((club) => {
                const isMember = club.my_status === "approved" || club.my_status === "joined";
                const isPending = club.my_status === "pending";
                return (
                  <article
                    key={club.id}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          {club.name}
                        </h3>
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                          {club.visibility}
                        </span>
                      </div>
                      {club.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {club.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                        <span>{club.member_count} riders</span>
                        {club.location_name && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3 text-primary" />
                            {club.location_name}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={busyClubId === club.id || isPending}
                        onClick={() => void toggleMembership(club)}
                        className={`min-h-[40px] rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          isMember
                            ? "border border-border text-foreground hover:border-destructive hover:text-destructive"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {isPending ? "Pending" : isMember ? "Leave" : "Join"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "events" && (
        <section className="space-y-4">
          {eventsError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between gap-3">
              <span className="text-xs text-destructive">{eventsError}</span>
              <button
                type="button"
                onClick={() => void loadEvents()}
                className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
              >
                Retry
              </button>
            </div>
          )}

          {eventsLoading ? (
            <div className="space-y-3">
              <div className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
              <div className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No upcoming community events scheduled right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <article
                  key={ev.id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-primary">
                        {ev.community_name}
                      </span>
                      <h3 className="font-display text-base font-bold text-foreground">
                        {ev.title}
                      </h3>
                    </div>
                    {ev.is_riding_event && (
                      <span className="rounded-full bg-primary/15 border border-primary/40 px-2.5 py-0.5 text-[10px] font-mono text-primary">
                        Group Ride
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
                    <span>{new Date(ev.start_time).toLocaleString()}</span>
                    {ev.location_name && <span>· {ev.location_name}</span>}
                    <span>· {ev.going_count} going</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(
                      [
                        { id: "going", label: "Going" },
                        { id: "interested", label: "Interested" },
                        { id: "not_going", label: "Can't Go" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={busyEventId === ev.id}
                        onClick={() => void handleRsvp(ev.id, opt.id)}
                        className={`min-h-[38px] rounded-full border px-3.5 text-xs font-semibold ${
                          ev.my_rsvp === opt.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "trips" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-3.5" />
              <input
                value={tripQuery}
                onChange={(e) => {
                  setTripQuery(e.target.value);
                  setTripsPage(1);
                }}
                placeholder="Filter trips by title…"
                className="w-full min-h-[44px] rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground"
              />
            </div>
          </div>

          {tripsError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between gap-3">
              <span className="text-xs text-destructive">{tripsError}</span>
              <button
                type="button"
                onClick={() => void loadTrips()}
                className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
              >
                Retry
              </button>
            </div>
          )}

          {tripsLoading ? (
            <div className="space-y-3">
              <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
              <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No recorded trips found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => {
                  const mins = Math.max(0, Math.floor(trip.total_duration_seconds / 60));
                  const hrs = Math.floor(mins / 60);
                  const durLabel = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                  return (
                    <article
                      key={trip.id}
                      className="rounded-2xl border border-border bg-card p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-sm font-bold text-foreground truncate">
                            {trip.title}
                          </h3>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {formatRelativeTime(trip.start_time)} · {trip.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteTripTarget(trip)}
                          aria-label={`Delete ${trip.title}`}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Navigation className="size-3 text-primary" />
                          {trip.total_distance_km.toFixed(1)} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3 text-primary" />
                          {durLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="size-3 text-primary" />
                          Avg {trip.avg_speed_kmh.toFixed(0)} km/h
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {tripsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={tripsPage <= 1}
                    onClick={() => setTripsPage((p) => Math.max(1, p - 1))}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-border px-4 text-xs font-semibold disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" /> Prev
                  </button>
                  <span className="text-xs font-mono text-muted-foreground">
                    Page {tripsPage} of {tripsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={tripsPage >= tripsTotalPages}
                    onClick={() => setTripsPage((p) => Math.min(tripsTotalPages, p + 1))}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-border px-4 text-xs font-semibold disabled:opacity-40"
                  >
                    Next <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === "support" && <SupportDeskPanel />}

      <ConfirmDialog
        open={Boolean(deleteTripTarget)}
        title="Delete Trip Record"
        message={`Delete "${deleteTripTarget?.title ?? "this trip"}" permanently?`}
        confirmLabel="Delete Trip"
        destructive
        busy={deleteTripBusy}
        onCancel={() => setDeleteTripTarget(null)}
        onConfirm={() => void confirmDeleteTrip()}
      />
    </div>
  );
}
