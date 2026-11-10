import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import {
  createFeedComment,
  createStatusPost,
  deleteFeedComment,
  deleteFeedPost,
  fetchFeedComments,
  fetchFeedPosts,
  likeFeedPost,
  unlikeFeedPost,
  type FeedPostItem,
  type PostCommentItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Status composer state
  const [statusCaption, setStatusCaption] = useState("");
  const [statusBikeLabel, setStatusBikeLabel] = useState("");
  const [statusVisibility, setStatusVisibility] = useState("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, PostCommentItem[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await fetchFeedPosts();
      setPosts(data);
    } catch (e) {
      console.warn("Failed to load feed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
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
    if (!isAuthenticated) return;
    const isLiked = post.viewer_has_liked;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              viewer_has_liked: !isLiked,
              like_count: isLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1,
            }
          : p,
      ),
    );

    try {
      if (isLiked) {
        await unlikeFeedPost(post.id);
      } else {
        await likeFeedPost(post.id);
      }
    } catch {
      // Revert on failure
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

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="font-display text-2xl font-black uppercase text-foreground">
            Rider Community Feed
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Stories, road condition callouts, and motorcycle updates from the REVV brotherhood.
          </p>
        </div>
      </div>

      {/* Status Composer */}
      {isAuthenticated && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary text-sm font-display">
              {user?.username?.charAt(0).toUpperCase() || "R"}
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              What's happening on the road, @{user?.username}?
            </span>
          </div>

          <textarea
            rows={3}
            placeholder="Share road hazards, maintenance triumphs, weekend canyon runs..."
            value={statusCaption}
            onChange={(e) => setStatusCaption(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary/30 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />

          {composerError && (
            <p className="font-mono text-xs text-destructive">{composerError}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Tag Motorcycle (e.g. ZX-25R)"
                value={statusBikeLabel}
                onChange={(e) => setStatusBikeLabel(e.target.value)}
                className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
              />
              <select
                value={statusVisibility}
                onChange={(e) => setStatusVisibility(e.target.value)}
                className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 font-mono text-xs text-muted-foreground focus:border-primary focus:outline-none"
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
      )}

      {/* Feed Posts List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="mx-auto size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-2">
          <p className="font-display text-base font-bold uppercase text-foreground">
            No Feed Posts Yet
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Be the first to share an update from your ride!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm"
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
                    post.viewer_has_liked
                      ? "text-rose-500 font-bold"
                      : "hover:text-foreground",
                  )}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      post.viewer_has_liked && "fill-rose-500",
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
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground font-sans">{c.comment_text}</p>
                      </div>
                    ))}
                  </div>

                  {isAuthenticated && (
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
                        className="rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-bold uppercase text-primary-foreground"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
