import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Loader2, Lock, MapPin, Search, Users } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { resolveMediaUrl } from "@/lib/api";
import { fetchCommunities, type CommunitySummary } from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "Clubs Directory — REVV" },
      {
        name: "description",
        content: "Discover motorcycle clubs, public riding groups, and private crews on REVV.",
      },
    ],
  }),
  component: ClubsDirectoryPage,
});

type PermissionFilter = "all" | "public" | "private";

function normalizeStatus(status?: string | null): string {
  return (status || "").trim().toLowerCase();
}

function ClubsDirectoryPage() {
  const { isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>("all");
  const [joinedOnly, setJoinedOnly] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchCommunities({
        search: debouncedSearch || undefined,
        visibility: permissionFilter === "all" ? undefined : permissionFilter,
        joined_only: isAuthenticated && joinedOnly ? true : undefined,
      });
      setClubs(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load clubs directory.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, permissionFilter, joinedOnly, isAuthenticated]);

  useEffect(() => {
    void loadClubs();
  }, [loadClubs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Community Directory
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Riding Clubs
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Explore public and private motorcycle clubs, browse upcoming rides, and connect with
              crews near you.
            </p>
          </div>
          <Link
            to="/leaderboard"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            View Leaderboard
          </Link>
        </div>

        {/* Search & Permission Filters */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search clubs by name, location, or description..."
              className="min-h-[44px] w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: "All Clubs" },
                { id: "public", label: "Public" },
                { id: "private", label: "Private" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPermissionFilter(opt.id)}
                className={cn(
                  "inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  permissionFilter === opt.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.id === "public" && <Globe className="h-4 w-4" />}
                {opt.id === "private" && <Lock className="h-4 w-4" />}
                {opt.label}
              </button>
            ))}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setJoinedOnly((v) => !v)}
                className={cn(
                  "inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  joinedOnly
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Users className="h-4 w-4" />
                My Clubs
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-72 animate-pulse rounded-2xl border border-border bg-card/60"
              />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="mt-8 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6 text-center">
            <p className="text-base font-semibold text-foreground">{errorMsg}</p>
            <button
              type="button"
              onClick={() => void loadClubs()}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try Again
            </button>
          </div>
        ) : clubs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold text-foreground">No clubs matched your filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing your search or switching the visibility filter.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => {
              const isPrivate = (club.visibility || "public").toLowerCase() === "private";
              const st = normalizeStatus(club.my_status);
              const isMember = st === "approved" || st === "active" || st === "joined";
              const isPending = st === "pending";

              return (
                <Link
                  key={club.id}
                  to="/clubs/$id"
                  params={{ id: club.id }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/45 hover:shadow-md"
                >
                  {/* Banner */}
                  <div className="relative h-32 w-full bg-gradient-to-br from-primary/25 via-secondary to-background">
                    {club.banner_url ? (
                      <img
                        src={resolveMediaUrl(club.banner_url) || ""}
                        alt={club.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/85 via-transparent to-transparent" />

                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm",
                          isPrivate
                            ? "border-amber-500/45 bg-background/80 text-amber-300"
                            : "border-emerald-500/45 bg-background/80 text-emerald-300",
                        )}
                      >
                        {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {isPrivate ? "Private" : "Public"}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col px-5 pb-5">
                    <div className="-mt-8 flex items-end justify-between gap-2">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-secondary shadow-sm">
                        {club.avatar_url ? (
                          <img
                            src={resolveMediaUrl(club.avatar_url) || ""}
                            alt={club.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                            {club.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {(isMember || isPending) && (
                        <span
                          className={cn(
                            "mb-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            isMember
                              ? "border-primary/40 bg-primary/15 text-primary"
                              : "border-amber-500/40 bg-amber-500/15 text-amber-300",
                          )}
                        >
                          {isMember ? "Member" : "Pending"}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {club.name}
                    </h2>

                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {club.description?.trim() || "Motorcycle club on REVV."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/85">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {club.member_count} {club.member_count === 1 ? "rider" : "riders"}
                      </span>
                      {club.location_name && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[60%]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{club.location_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {!isAuthenticated && <SiteFooter />}
    </div>
  );
}
