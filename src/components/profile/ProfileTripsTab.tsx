import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Gauge, Navigation, RefreshCw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { deleteMyTrip, fetchMyTrips, type RideTripSummary } from "@/lib/api-rider";
import { formatRelativeTime } from "@/lib/date";

function formatDuration(seconds: number): string {
  const mins = Math.max(0, Math.floor(seconds / 60));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
}

export function ProfileTripsTab() {
  const [trips, setTrips] = useState<RideTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RideTripSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyTrips({ page: 1, limit: 8 });
      setTrips(res.trips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recorded trips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await deleteMyTrip(deleteTarget.id);
      setTrips((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trip.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-destructive">{error}</span>
        <button
          type="button"
          onClick={() => void loadTrips()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Recent rides synced from the REVV cockpit app.
        </p>
        <Link
          to="/rides"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary/50"
        >
          Full Trip Log <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2">
          <Navigation className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No recorded trips yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
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
                    {formatRelativeTime(trip.start_time)} • {trip.status}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === trip.id}
                  onClick={() => setDeleteTarget(trip)}
                  aria-label={`Delete ${trip.title}`}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
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
                  {formatDuration(trip.total_duration_seconds)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="size-3 text-primary" />
                  Avg {trip.avg_speed_kmh.toFixed(0)} km/h
                  {typeof trip.max_speed_kmh === "number" && trip.max_speed_kmh > 0
                    ? ` · Max ${trip.max_speed_kmh.toFixed(0)}`
                    : ""}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Trip Record"
        message={`Delete "${deleteTarget?.title ?? "this trip"}" from your ride history? This cannot be undone.`}
        confirmLabel="Delete Trip"
        destructive
        busy={Boolean(busyId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
