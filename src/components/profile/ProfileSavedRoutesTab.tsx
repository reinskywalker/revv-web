import { useCallback, useEffect, useState } from "react";
import { Clock, MapPin, Navigation, RefreshCw, Route, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import {
  deleteMySavedRoute,
  fetchMySavedRoutes,
  fetchUserSavedRoutes,
  updateSavedRouteVisibility,
  type SavedRouteItem,
} from "@/lib/api-rider";
import { formatRelativeTime } from "@/lib/date";

interface ProfileSavedRoutesTabProps {
  userId: string;
  isSelf: boolean;
  isPrivateAccount: boolean;
}

export function ProfileSavedRoutesTab({
  userId,
  isSelf,
  isPrivateAccount,
}: ProfileSavedRoutesTabProps) {
  const [routes, setRoutes] = useState<SavedRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedRouteItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRoutes = useCallback(async () => {
    if (!isSelf && isPrivateAccount) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = isSelf ? await fetchMySavedRoutes() : await fetchUserSavedRoutes(userId);
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved routes.");
    } finally {
      setLoading(false);
    }
  }, [isSelf, isPrivateAccount, userId]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  async function handleVisibilityChange(
    routeId: string,
    visibility: "public" | "friends" | "private",
  ) {
    setBusyId(routeId);
    setError(null);
    try {
      await updateSavedRouteVisibility(routeId, visibility);
      setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, visibility } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route visibility.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await deleteMySavedRoute(deleteTarget.id);
      setRoutes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!isSelf && isPrivateAccount) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Saved routes are hidden because this profile is private.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-destructive">{error}</span>
        <button
          type="button"
          onClick={() => void loadRoutes()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2">
        <Route className="size-8 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No saved routes shared yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routes.map((route) => (
          <article
            key={route.id}
            className="rounded-2xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground truncate">
                  {route.name}
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {formatRelativeTime(route.created_at)}
                </p>
              </div>
              {isSelf ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    aria-label={`Visibility for ${route.name}`}
                    disabled={busyId === route.id}
                    value={(route.visibility ?? "private").toLowerCase()}
                    onChange={(e) =>
                      void handleVisibilityChange(
                        route.id,
                        e.target.value as "public" | "friends" | "private",
                      )
                    }
                    className="min-h-[36px] rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-mono text-foreground"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends</option>
                    <option value="private">Private</option>
                  </select>
                  <button
                    type="button"
                    disabled={busyId === route.id}
                    onClick={() => setDeleteTarget(route)}
                    aria-label={`Delete ${route.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                  {route.visibility ?? "public"}
                </span>
              )}
            </div>

            {route.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{route.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground">
              {(route.origin_name || route.destination_name) && (
                <span className="inline-flex items-center gap-1 truncate max-w-full">
                  <MapPin className="size-3 text-primary shrink-0" />
                  {[route.origin_name, route.destination_name].filter(Boolean).join(" → ")}
                </span>
              )}
              {typeof route.distance_km === "number" && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Navigation className="size-3 text-primary" />
                  {route.distance_km.toFixed(1)} km
                </span>
              )}
              {typeof route.estimated_duration_min === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3 text-primary" />
                  {route.estimated_duration_min} min
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Saved Route"
        message={`Delete "${deleteTarget?.name ?? "this route"}" permanently from your saved routes?`}
        confirmLabel="Delete Route"
        destructive
        busy={Boolean(busyId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
