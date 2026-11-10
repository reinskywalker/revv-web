import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Heart,
  MessageCircle,
  MessageSquare,
  Navigation,
  Newspaper,
  Radar,
  Radio,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { FeedPhone, NavPhone, ProfilePhone } from "@/components/revv/phone-mockups";
import { Wordmark } from "@/components/revv/wordmark";
import heroRiders from "@/assets/hero-riders.webp";
import bikeDetail from "@/assets/bike-detail.jpg";
import routeMapDark from "@/assets/route-map-dark.jpg";
import {
  acceptFriendRequest,
  createFeedComment,
  createStatusPost,
  deleteFeedComment,
  deleteFeedPost,
  fetchFeedComments,
  fetchFeedPosts,
  fetchFriendRequests,
  fetchFriends,
  likeFeedPost,
  rejectFriendRequest,
  searchRiders,
  sendFriendRequest,
  unlikeFeedPost,
  type FeedPostItem,
  type FriendRequestItem,
  type FriendUserItem,
  type PostCommentItem,
  type SocialRiderSearchResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  const y = Math.floor(diffDays / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "description",
        content:
          "REVV- Web is the motorcycle portal for neighborhood crews: turn-by-turn HUD navigation, rider feed, clubs, group voice intercom, and digital garage telemetry.",
      },
      { property: "og:site_name", content: "REVV- Web" },
      { property: "og:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        property: "og:description",
        content:
          "The riding companion for neighborhood crews: turn-by-turn navigation, rider feed, communities, group voice, and a digital garage. Start rides, share routes, and stay connected.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://revv.asteralabs.digital" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "twitter:description",
        content:
          "Turn-by-turn navigation, crew feeds, communities, group voice, and a digital garage. Every road has a story.",
      },
      {
        name: "keywords",
        content:
          "REVV- Web, REVV, riding companion, motorcycle navigation, turn by turn HUD, motorcycle garage, rider community, intercom, asteralabs digital",
      },
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <AuthenticatedHome user={user} />;
  }

  return <MarketingLandingPage />;
}

/* ==========================================================================
   AUTHENTICATED RIDER HOME (FEED + FRIENDS ROSTER + DEBOUNCED SEARCH)
   ========================================================================== */

function AuthenticatedHome({ user }: { user: any }) {
  // Feed state
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Status composer state
  const [statusCaption, setStatusCaption] = useState("");
  const [statusBikeLabel, setStatusBikeLabel] = useState("");
  const [statusVisibility, setStatusVisibility] = useState("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Feed Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, PostCommentItem[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Friends & Requests state
  const [friends, setFriends] = useState<FriendUserItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);

  // Search state with debounce
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialRiderSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Active tab on mobile / small screens
  const [activeTab, setActiveTab] = useState<"feed" | "friends">("feed");

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute rider search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    searchRiders(debouncedQuery)
      .then((data) => {
        if (active) {
          setSearchResults(data);
        }
      })
      .catch((err) => {
        console.warn("Search riders error:", err);
        if (active) setSearchResults([]);
      })
      .finally(() => {
        if (active) setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const data = await fetchFeedPosts();
      setPosts(data);
    } catch (e) {
      console.warn("Failed to load feed:", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadSocial = async () => {
    setLoadingSocial(true);
    try {
      const [friendsData, requestsData] = await Promise.allSettled([
        fetchFriends(),
        fetchFriendRequests(),
      ]);
      if (friendsData.status === "fulfilled") {
        setFriends(friendsData.value);
      }
      if (requestsData.status === "fulfilled") {
        setRequests(requestsData.value.filter((r) => !r.is_outgoing));
      }
    } catch (e) {
      console.warn("Failed to load friends/requests:", e);
    } finally {
      setLoadingSocial(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    void loadSocial();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusCaption.trim()) return;
    setPosting(true);
    setComposerError(null);
    try {
      await createStatusPost({
        caption: statusCaption.trim(),
        bike_label: statusBikeLabel.trim() || undefined,
        visibility: statusVisibility,
      });
      setStatusCaption("");
      setStatusBikeLabel("");
      await loadFeed();
    } catch (err: any) {
      setComposerError(err?.message || "Failed to publish post");
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (post: FeedPostItem) => {
    const isLiked = post.is_liked_by_me ?? (post as any).viewer_has_liked ?? false;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              is_liked_by_me: !isLiked,
              viewer_has_liked: !isLiked,
              like_count: isLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1,
            }
          : p,
      ),
    );

    try {
      const res = isLiked
        ? await unlikeFeedPost(post.id)
        : await likeFeedPost(post.id);
      // Sync authoritative state from backend
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                is_liked_by_me: res.liked,
                viewer_has_liked: res.liked,
                like_count: res.like_count,
              }
            : p,
        ),
      );
    } catch {
      void loadFeed();
    }
  };

  const handleToggleComments = async (postId: string) => {
    const isOpening = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: isOpening }));

    if (isOpening && !postComments[postId]) {
      try {
        const comments = await fetchFeedComments(postId);
        setPostComments((prev) => ({ ...prev, [postId]: comments }));
      } catch {
        // ignore
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text) return;
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const comment = await createFeedComment(postId, text);
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setNewCommentText((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)),
      );
    } catch (err) {
      console.warn("Failed to add comment:", err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      setActionNotice("Friend request accepted!");
      setTimeout(() => setActionNotice(null), 3000);
      await loadSocial();
    } catch (e) {
      console.warn("Accept friend request failed:", e);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      setActionNotice("Friend request declined.");
      setTimeout(() => setActionNotice(null), 3000);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.warn("Reject friend request failed:", e);
    }
  };

  const handleSendFriendRequest = async (targetId: string) => {
    try {
      await sendFriendRequest(targetId);
      setActionNotice("Friend request sent!");
      setTimeout(() => setActionNotice(null), 3000);
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === targetId ? { ...item, friendship_status: "outgoing_request" } : item,
        ),
      );
    } catch (e: any) {
      setActionNotice(e?.message || "Failed to send friend request");
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-display text-2xl font-black uppercase text-foreground tracking-tight">
              Rider Community & Feed
            </h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Welcome back, <span className="font-bold text-foreground">@{user?.username || "rider"}</span>. Road alerts, maintenance logs, and brotherhood chatter.
          </p>
        </div>

        {/* Action toast notice */}
        {actionNotice && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-xs text-primary animate-fade-in shadow-sm">
            <Sparkles className="size-3.5" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex rounded-xl border border-border bg-card p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={cn(
            "flex-1 py-2 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-colors",
            activeTab === "feed"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Feed & Updates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("friends")}
          className={cn(
            "flex-1 py-2 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5",
            activeTab === "friends"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>Friends & Crew</span>
          {requests.length > 0 && (
            <span className="size-4 rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ===================================================================
            FEED COLUMN (7 Cols)
            =================================================================== */}
        <div
          className={cn(
            "space-y-6 lg:col-span-7",
            activeTab !== "feed" && "hidden lg:block",
          )}
        >
          {/* Status Composer */}
          <form
            onSubmit={handleCreatePost}
            className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary text-sm font-display border border-primary/30">
                {user?.username?.charAt(0).toUpperCase() || "R"}
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Post a Status Update
                </h3>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Broadcast hazards, road conditions, or garage milestones.
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="What's happening on your route or in your garage today?"
              value={statusCaption}
              onChange={(e) => setStatusCaption(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/30 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors"
            />

            {composerError && (
              <p className="font-mono text-xs text-destructive">{composerError}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Tag Bike (e.g. ZX-25R, XSR155)"
                  value={statusBikeLabel}
                  onChange={(e) => setStatusBikeLabel(e.target.value)}
                  className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                />
                <select
                  value={statusVisibility}
                  onChange={(e) => setStatusVisibility(e.target.value)}
                  className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="FRIENDS">Friends Only</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={posting || !statusCaption.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {posting ? "Publishing..." : "Post Update"}
              </button>
            </div>
          </form>

          {/* Feed Posts List */}
          {loadingFeed ? (
            <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
              <div className="mx-auto size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="font-mono text-xs text-muted-foreground mt-3">Loading crew updates...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-card/30">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Radio className="size-6" />
              </div>
              <p className="font-display text-base font-bold uppercase text-foreground">
                No Feed Posts Yet
              </p>
              <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto">
                Be the first rider in the crew to share an update from your machine or weekend ride!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/20 transition-colors"
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/id/${encodeURIComponent(post.author_username)}`}
                      className="group flex items-center gap-3"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-secondary font-display text-sm font-bold text-primary overflow-hidden border border-border">
                        {post.author_avatar ? (
                          <img
                            src={post.author_avatar}
                            alt={post.author_display_name}
                            className="size-full object-cover"
                          />
                        ) : (
                          post.author_username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {post.author_display_name || post.author_username}
                        </h4>
                        <span className="font-mono text-xs text-muted-foreground">
                          @{post.author_username} · {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>

                    {post.bike_label && (
                      <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                        {post.bike_label}
                      </span>
                    )}
                  </div>

                  {/* Caption */}
                  <p className="text-sm text-foreground/95 leading-relaxed font-sans whitespace-pre-line">
                    {post.caption}
                  </p>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-6 border-t border-border/60 pt-3 text-xs font-mono text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        (post.is_liked_by_me || post.viewer_has_liked)
                          ? "text-rose-500 font-bold"
                          : "hover:text-foreground",
                      )}
                    >
                      <Heart
                        className={cn(
                          "size-4",
                          (post.is_liked_by_me || post.viewer_has_liked) && "fill-rose-500",
                        )}
                      />
                      <span>{post.like_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleComments(post.id)}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="size-4" />
                      <span>{post.comment_count} Comments</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments[post.id] && (
                    <div className="space-y-3 border-t border-border/40 pt-3">
                      <div className="space-y-2">
                        {(postComments[post.id] || []).map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg bg-secondary/30 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <Link
                                to={`/id/${encodeURIComponent(c.author_username)}`}
                                className="font-mono font-bold text-foreground hover:text-primary transition-colors"
                              >
                                @{c.author_username}
                              </Link>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {formatRelativeTime(c.created_at)}
                              </span>
                            </div>
                            <p className="text-muted-foreground font-sans">
                              {c.comment || (c as any).comment_text}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentText[post.id] || ""}
                          onChange={(e) =>
                            setNewCommentText((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={submittingComment[post.id]}
                          onClick={() => handleAddComment(post.id)}
                          className="rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-bold uppercase text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ===================================================================
            FRIENDS & SEARCH COLUMN (5 Cols)
            =================================================================== */}
        <div
          className={cn(
            "space-y-6 lg:col-span-5",
            activeTab !== "friends" && "hidden lg:block",
          )}
        >
          {/* Friend Search Card (Debounced) */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Search className="size-4 text-primary" />
                Find Riders
              </h3>
              {isSearching && (
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search riders by username, name, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none pr-8 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {debouncedQuery && (
              <div className="space-y-2 pt-1 border-t border-border/50">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Search Results ({searchResults.length})
                </p>

                {searchResults.length === 0 && !isSearching ? (
                  <p className="font-mono text-xs text-muted-foreground py-2 text-center">
                    No riders found matching "{debouncedQuery}"
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 p-2.5 text-xs"
                      >
                        <Link
                          to={`/id/${encodeURIComponent(r.username)}`}
                          className="flex items-center gap-2.5 overflow-hidden group"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-xs font-bold text-primary overflow-hidden border border-border">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt={r.display_name} className="size-full object-cover" />
                            ) : (
                              r.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="truncate">
                            <h5 className="font-display font-bold text-foreground group-hover:text-primary truncate">
                              {r.display_name}
                            </h5>
                            <span className="font-mono text-[11px] text-muted-foreground truncate block">
                              @{r.username} {r.city ? `· ${r.city}` : ""}
                            </span>
                          </div>
                        </Link>

                        <div className="shrink-0 pl-2">
                          {r.friendship_status === "friends" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-500 border border-emerald-500/30">
                              <Check className="size-3" /> Friends
                            </span>
                          ) : r.friendship_status === "outgoing_request" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-500 border border-amber-500/30">
                              <Clock className="size-3" /> Pending
                            </span>
                          ) : r.friendship_status === "incoming_request" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/30">
                              Incoming
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendFriendRequest(r.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition"
                            >
                              <UserPlus className="size-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Requests Box */}
          {requests.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3 shadow-sm">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                <span>Friend Requests</span>
                <span className="size-5 rounded-full bg-primary text-[10px] font-mono font-bold text-primary-foreground flex items-center justify-center">
                  {requests.length}
                </span>
              </h3>

              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 text-xs shadow-xs"
                  >
                    <Link
                      to={`/id/${encodeURIComponent(req.username)}`}
                      className="flex items-center gap-2.5 overflow-hidden group"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-xs font-bold text-primary overflow-hidden border border-border">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt={req.display_name} className="size-full object-cover" />
                        ) : (
                          req.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <h5 className="font-display font-bold text-foreground group-hover:text-primary truncate">
                          {req.display_name}
                        </h5>
                        <span className="font-mono text-[11px] text-muted-foreground truncate block">
                          @{req.username}
                        </span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req.id)}
                        className="rounded-lg bg-primary px-2.5 py-1 font-display text-[11px] font-bold uppercase text-primary-foreground hover:bg-primary/90 transition"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req.id)}
                        className="rounded-lg border border-border bg-secondary px-2 py-1 font-display text-[11px] font-bold text-muted-foreground hover:text-foreground transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List Roster */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Your Crew & Friends
              </h3>
              <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {friends.length} Friends
              </span>
            </div>

            {loadingSocial ? (
              <div className="py-6 text-center">
                <div className="mx-auto size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                <p className="font-display text-xs font-bold uppercase text-foreground">
                  No Friends Connected
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Search riders above to add companions to your crew!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <Link
                    key={friend.friend_id}
                    to={`/id/${encodeURIComponent(friend.username)}`}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/15 p-2.5 transition hover:border-primary/40 hover:bg-secondary/30 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-xs font-bold text-primary overflow-hidden border border-border">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.display_name}
                            className="size-full object-cover"
                          />
                        ) : (
                          friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="font-display text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {friend.display_name}
                        </h4>
                        <span className="font-mono text-[11px] text-muted-foreground truncate block">
                          @{friend.username} {friend.city ? `· ${friend.city}` : ""}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 pl-2">
                      Connected
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PUBLIC MARKETING LANDING PAGE (UNAUTHENTICATED)
   ========================================================================== */

const pillars = [
  {
    number: "01",
    title: "Ride Together",
    body: "Start rides, drop routes, and keep the whole crew in one channel — from the first meet-up point to the last stop.",
  },
  {
    number: "02",
    title: "Navigate",
    body: "Turn-by-turn guidance built for two wheels. Pause when you stop for coffee, resume without splitting your stats into multiple trips.",
  },
  {
    number: "03",
    title: "Belong",
    body: "Find real motorcycle clubs, join riding events, and talk shop in threads and channels with riders near you.",
  },
];

const features = [
  {
    icon: Newspaper,
    title: "Rider Feed",
    body: "Post your machine, your route, your stories. Cheer the crew in the comments and catch every new post.",
  },
  {
    icon: Users,
    title: "Communities & Events",
    body: "Join or start real motorcycle clubs, discuss in threads, chat in channels, and coordinate riding events.",
  },
  {
    icon: MessageSquare,
    title: "Group Chat",
    body: "One place for the crew — plan the ride, share the road, settle where to eat.",
  },
];

function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero — dark cockpit identity */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <img
          src={heroRiders}
          alt="A crew of sport motorcycle riders on the road"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Darkening & cinematic vignette overlay */}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/35" />

        {/* REVV signature dot matrix pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.22) 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 35%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 95%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle REVV primary atmospheric glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: "radial-gradient(ellipse at 50% 25%, var(--primary) 0%, transparent 65%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-6 pb-14 pt-28">
          <div className="flex flex-col items-center pt-[12vh] text-center">
            {/* Closed Beta / Coming Soon indicator */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/50 bg-background/80 px-4 py-1.5 backdrop-blur-sm shadow-lg">
              <span className="flex size-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">
                COMING SOON
              </span>
              <span className="text-border">|</span>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Currently in closed beta testing phase
              </span>
            </div>

            <p className="eyebrow mt-6">Friendly Neighborhood Riding Companion</p>
            <Wordmark className="mt-6 text-[clamp(4rem,16vw,11rem)] leading-none" />
          </div>
          <div className="mt-16 max-w-2xl">
            <div className="flex gap-2" aria-hidden>
              <span className="h-1 flex-1 rounded-full bg-primary" />
              <span className="h-1 flex-1 rounded-full bg-border" />
              <span className="h-1 flex-1 rounded-full bg-border" />
            </div>
            <p className="eyebrow mt-5 text-primary">01 / 03 · Ride Together</p>
            <h1 className="display-heading mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
              Every road has a story.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/85">
              Start rides, share routes, and stay connected with crews around Jakarta — and wherever
              the road takes you next.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary">
                Join Closed Beta
                <ArrowRight className="size-5" />
              </Link>
              <Link to="/login" className="btn-ghost">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars — editorial three-column grid */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {pillars.map((pillar) => (
            <div key={pillar.number} className="flex flex-col justify-between p-9 md:p-12">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  {pillar.number}
                </span>
                <h3 className="display-heading mt-6 text-2xl font-bold uppercase text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {pillar.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature showcase: Digital Garage */}
      <section className="relative overflow-hidden border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary">
              <Wrench className="size-3.5" />
              Digital Garage & Telemetry
            </div>
            <h2 className="display-heading mt-6 text-[clamp(2rem,4.5vw,3.25rem)] font-black uppercase text-foreground">
              Maintain your machine like a pro.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Keep a complete service ledger for every bike in your stable. Track oil change intervals,
              brake pad thickness, tire wear, and valve adjustments with automated alerts before ride day.
            </p>
            <div className="mt-8">
              <Link to="/register" className="btn-primary">
                Explore Garage
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border shadow-2xl">
            <img
              src={bikeDetail}
              alt="Motorcycle workshop mechanic inspecting suspension"
              className="size-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Feature showcase: Navigation HUD */}
      <section className="relative overflow-hidden border-t border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div className="order-2 lg:order-1 relative aspect-4/3 overflow-hidden rounded-2xl border border-border shadow-2xl">
            <img
              src={routeMapDark}
              alt="Turn by turn navigation polyline across mountain pass"
              className="size-full object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary">
              <Navigation className="size-3.5" />
              Two-Wheel Navigation
            </div>
            <h2 className="display-heading mt-6 text-[clamp(2rem,4.5vw,3.25rem)] font-black uppercase text-foreground">
              Built for motorcycle cockpits.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              High-contrast night HUD, multi-waypoint canyon routing, and coffee-stop pause/resume without
              splitting your ride stats into fragmented trips.
            </p>
          </div>
        </div>
      </section>

      {/* Phone mockups preview */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="eyebrow-panel">Inside the app</p>
          <h2 className="display-heading-panel mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]">
            The cockpit, up close.
          </h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <FeedPhone />
            <NavPhone />
            <ProfilePhone />
          </div>
        </div>
      </section>

      {/* News teaser */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="panel-card flex flex-col gap-6 p-9 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow-panel">Motorcycle news</p>
              <h2 className="display-heading-panel mt-3 text-2xl sm:text-3xl">
                Stories from the garage desk.
              </h2>
              <p className="mt-2 text-lg text-panel-muted">
                Maintenance, safety, and riding craft — written for riders.
              </p>
            </div>
            <Link
              to="/news"
              className="btn-ghost-panel w-fit shrink-0"
              aria-label="Go to motorcycle news"
            >
              Go to news
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA — red band */}
      <section className="bg-primary">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h2 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-none tracking-tight text-primary-foreground">
            Ready to ride?
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-primary-foreground/90">
            Grab your rider ID and join the neighborhood. Passwordless, no nonsense — just the road.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-9 py-4 font-display text-base font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
            >
              Join Closed Beta
              <ArrowRight className="size-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/50 px-8 py-4 font-display text-base font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Rider Sign In
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
