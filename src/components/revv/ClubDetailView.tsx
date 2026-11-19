import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Hash,
  HelpCircle,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Plus,
  Send,
  Share2,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { AppOpenBanner } from "@/components/revv/AppOpenBanner";
import { resolveMediaUrl, type FeedPostItem } from "@/lib/api";
import {
  AuthApiError,
  createCommunityChannel,
  createCommunityStatusPost,
  createCommunityThread,
  createEventShareLink,
  fetchChannelMessages,
  fetchCommunities,
  fetchCommunityDetail,
  fetchCommunityPosts,
  joinCommunity,
  leaveCommunity,
  rsvpCommunityEvent,
  sendChannelMessage,
  type CommunityChannelMessageItem,
  type CommunityChatChannelItem,
  type CommunityDetailResponse,
  type CommunitySummary,
} from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type ClubTab = "feed" | "channels" | "events" | "threads" | "members";

interface ClubDetailViewProps {
  communityId: string;
}

function isApprovedMemberStatus(status?: string | null): boolean {
  const s = (status || "").trim().toLowerCase();
  return s === "approved" || s === "active";
}

function isPendingMemberStatus(status?: string | null): boolean {
  return (status || "").trim().toLowerCase() === "pending";
}

function isAdminRole(role?: string | null): boolean {
  const r = (role || "").trim().toLowerCase();
  return r === "founder" || r === "owner" || r === "administrator" || r === "admin";
}

function formatReadableDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClubDetailView({ communityId }: ClubDetailViewProps) {
  const { user, isAuthenticated } = useAuth();

  const [detail, setDetail] = useState<CommunityDetailResponse | null>(null);
  const [fallbackSummary, setFallbackSummary] = useState<CommunitySummary | null>(null);
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPrivateBlocked, setIsPrivateBlocked] = useState(false);

  const [activeTab, setActiveTab] = useState<ClubTab>("feed");
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Feed post composer
  const [postCaption, setPostCaption] = useState("");
  const [postingStatus, setPostingStatus] = useState(false);

  // Thread composer
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [creatingThread, setCreatingThread] = useState(false);

  // Channel chat state
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunityChannelMessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Create channel state (Founder / Admin)
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelVisibility, setNewChannelVisibility] = useState<"member" | "administrator">(
    "member",
  );
  const [creatingChannel, setCreatingChannel] = useState(false);

  const [sharingEventId, setSharingEventId] = useState<string | null>(null);

  const loadClub = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsPrivateBlocked(false);

    try {
      const data = await fetchCommunityDetail(communityId);
      setDetail(data);
      setFallbackSummary(data.community);

      const isPrivate = (data.community.visibility || "public").toLowerCase() === "private";
      const approved = isApprovedMemberStatus(data.community.my_status) ||
        Boolean(user?.id && data.community.owner_id === user.id);

      if (!isPrivate || approved) {
        const clubPosts = await fetchCommunityPosts(communityId).catch(() => []);
        setPosts(clubPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      if (err instanceof AuthApiError && err.statusCode === 403) {
        setIsPrivateBlocked(true);
        // Fetch summary from list so user sees club name, avatar & join request status
        try {
          const all = await fetchCommunities();
          const found = all.find((c) => c.id === communityId) || null;
          setFallbackSummary(found);
        } catch {
          // keep minimal private gate
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Could not load club details.");
      }
    } finally {
      setLoading(false);
    }
  }, [communityId, user?.id]);

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  const community = detail?.community ?? fallbackSummary;
  const isOwner = Boolean(user?.id && community && community.owner_id === user.id);
  const isApproved = Boolean(
    community && (isOwner || isApprovedMemberStatus(community.my_status)),
  );
  const isPending = Boolean(community && isPendingMemberStatus(community.my_status));
  const isPrivate = (community?.visibility || "public").toLowerCase() === "private";
  const canManage = Boolean(community && (isOwner || isAdminRole(community.my_role)));

  const sortedChannels = useMemo(() => {
    const raw = detail?.channels ?? [];
    return [...raw].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [detail?.channels]);

  const adminChannels = useMemo(
    () => sortedChannels.filter((c) => (c.visibility || "member").toLowerCase() === "administrator"),
    [sortedChannels],
  );
  const memberChannels = useMemo(
    () => sortedChannels.filter((c) => (c.visibility || "member").toLowerCase() !== "administrator"),
    [sortedChannels],
  );

  // Auto-select first channel when entering channels tab
  useEffect(() => {
    if (activeTab === "channels" && sortedChannels.length > 0) {
      if (!selectedChannelId || !sortedChannels.some((c) => c.id === selectedChannelId)) {
        const firstChannel = sortedChannels[0];
        if (firstChannel) {
          setSelectedChannelId(firstChannel.id);
        }
      }
    }
  }, [activeTab, sortedChannels, selectedChannelId]);

  useEffect(() => {
    if (activeTab !== "channels" || !selectedChannelId || !isApproved) return;
    let active = true;
    setMessagesLoading(true);
    fetchChannelMessages(communityId, selectedChannelId)
      .then((list) => {
        if (active) setMessages(list);
      })
      .catch(() => {
        if (active) setMessages([]);
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, selectedChannelId, communityId, isApproved]);

  const handleCopyClubLink = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/clubs/${communityId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setActionNotice(`Share URL: ${shareUrl}`);
    }
  };

  const handleMembershipAction = async () => {
    if (!community) return;
    setMembershipLoading(true);
    setActionNotice(null);
    try {
      if (isApproved || isPending) {
        await leaveCommunity(community.id);
        setActionNotice(isPending ? "Join request cancelled." : "You left the club.");
      } else {
        await joinCommunity(community.id);
        setActionNotice(
          isPrivate
            ? "Join request sent. An administrator will review your request."
            : "Welcome to the club! Your membership is now active.",
        );
      }
      await loadClub();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const caption = postCaption.trim();
    if (!caption) return;
    setPostingStatus(true);
    try {
      const created = await createCommunityStatusPost(communityId, caption);
      setPosts((prev) => [created, ...prev]);
      setPostCaption("");
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to publish post.");
    } finally {
      setPostingStatus(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (threadTitle.trim().length < 3 || threadBody.trim().length < 3) return;
    setCreatingThread(true);
    try {
      await createCommunityThread(communityId, {
        title: threadTitle.trim(),
        body: threadBody.trim(),
      });
      setThreadTitle("");
      setThreadBody("");
      setShowThreadForm(false);
      await loadClub();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to start thread.");
    } finally {
      setCreatingThread(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const ch = await createCommunityChannel(communityId, {
        name: newChannelName.trim(),
        description: newChannelDesc.trim() || undefined,
        visibility: newChannelVisibility,
      });
      setNewChannelName("");
      setNewChannelDesc("");
      setNewChannelVisibility("member");
      setShowCreateChannel(false);
      setSelectedChannelId(ch.id);
      await loadClub();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to create channel.");
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      const msg = await sendChannelMessage(communityId, selectedChannelId, chatInput.trim());
      setMessages((prev) => [...prev, msg]);
      setChatInput("");
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleRsvp = async (eventId: string, status: "going" | "tentative" | "not_going") => {
    try {
      await rsvpCommunityEvent(eventId, status);
      await loadClub();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Could not save RSVP.");
    }
  };

  const handleShareEventLink = async (eventId: string) => {
    setSharingEventId(eventId);
    try {
      const res = await createEventShareLink(eventId);
      const url = `${window.location.origin}/e/${res.token}`;
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      setActionNotice(`Event view link ready and copied: ${url}`);
      await loadClub();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to create event link.");
    } finally {
      setSharingEventId(null);
    }
  };

  const selectedChannel: CommunityChatChannelItem | undefined = sortedChannels.find(
    (c) => c.id === selectedChannelId,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <AppOpenBanner
        deepLinkPath={`clubs/${communityId}`}
        title={community ? `Open ${community.name} in REVV App` : "Open this club in REVV App"}
        subtitle="Enjoy real-time push notifications, channel mentions, and group ride coordination."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-base font-medium text-foreground">Loading club...</p>
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-rose-500/30 bg-card p-8 text-center">
          <p className="text-base font-semibold text-foreground">{errorMsg}</p>
          <Link
            to="/clubs"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to Clubs Directory
          </Link>
        </div>
      ) : !community ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-3 text-xl font-bold text-foreground">Private Club</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            This club is restricted to approved members. Sign in to check membership or request
            access from the clubs directory.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Sign In to Continue
              </Link>
            )}
            <Link
              to="/clubs"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Browse Clubs
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Header */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="relative h-44 w-full bg-gradient-to-br from-primary/25 via-secondary to-background sm:h-56">
              {community.banner_url && (
                <img
                  src={resolveMediaUrl(community.banner_url) || ""}
                  alt={community.name}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
            </div>

            <div className="relative px-6 pb-6">
              <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-secondary shadow-md">
                    {community.avatar_url ? (
                      <img
                        src={resolveMediaUrl(community.avatar_url) || ""}
                        alt={community.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                        {community.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                          isPrivate
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                            : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
                        )}
                      >
                        {isPrivate && <Lock className="h-3 w-3" />}
                        {isPrivate ? "Private Club" : "Public Club"}
                      </span>
                      {community.my_role && isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Shield className="h-3 w-3" />
                          {community.my_role}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-1.5 text-2xl font-bold text-foreground sm:text-3xl">
                      {community.name}
                    </h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleCopyClubLink()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-secondary/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copiedUrl ? "Link Copied" : "Share URL"}
                  </button>

                  {isAuthenticated ? (
                    !isOwner && (
                      <button
                        type="button"
                        disabled={membershipLoading}
                        onClick={() => void handleMembershipAction()}
                        className={cn(
                          "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition",
                          isApproved
                            ? "border border-border bg-secondary text-foreground hover:border-rose-500/50 hover:text-rose-300"
                            : isPending
                              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        {membershipLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isApproved
                          ? "Leave Club"
                          : isPending
                            ? "Request Pending"
                            : isPrivate
                              ? "Request to Join"
                              : "Join Club"}
                      </button>
                    )
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Sign In to Join
                    </Link>
                  )}
                </div>
              </div>

              {community.description && (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/85">
                  {community.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {community.location_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    {community.location_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  {community.member_count} members
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  {community.event_count} events
                </span>
              </div>

              {actionNotice && (
                <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
                  {actionNotice}
                </p>
              )}
            </div>
          </section>

          {/* Private Lock Gate */}
          {(isPrivateBlocked || (isPrivate && !isApproved)) ? (
            <section className="rounded-2xl border border-amber-500/30 bg-card p-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-amber-400" />
              <h2 className="mt-3 text-xl font-bold text-foreground">Members-Only Club</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {isPending
                  ? "Your request to join this private club is pending approval from an administrator."
                  : isAuthenticated
                    ? "Posts, channels, events, and member lists are hidden until an administrator approves your request to join."
                    : "This club is private. Sign in and request to join to view posts, channels, and ride events."}
              </p>
            </section>
          ) : (
            <>
              {/* Mobile-like Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                {(
                  [
                    { id: "feed", label: "Feed", count: posts.length },
                    ...(isApproved
                      ? [{ id: "channels" as const, label: "Channels", count: sortedChannels.length }]
                      : []),
                    { id: "events", label: "Events", count: detail?.events.length ?? 0 },
                    { id: "threads", label: "Threads", count: detail?.threads.length ?? 0 },
                    { id: "members", label: "Members", count: detail?.members.length ?? 0 },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                      activeTab === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        activeTab === t.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-foreground/80",
                      )}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* FEED TAB */}
              {activeTab === "feed" && (
                <div className="space-y-4">
                  {isApproved && (
                    <form
                      onSubmit={(e) => void handleCreatePost(e)}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <label className="block text-sm font-semibold text-foreground">
                        Share an update with the club
                      </label>
                      <textarea
                        rows={3}
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder="Write a ride update, mention riders with @username..."
                        className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="submit"
                          disabled={postingStatus || !postCaption.trim()}
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          {postingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                          Post Update
                        </button>
                      </div>
                    </form>
                  )}

                  {posts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                      No club posts yet.
                    </div>
                  ) : (
                    posts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {post.author_avatar_url ? (
                            <img
                              src={resolveMediaUrl(post.author_avatar_url) || ""}
                              alt={post.author_display_name}
                              className="h-10 w-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                              {(post.author_display_name || post.author_username || "R")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              to="/id/$username"
                              params={{ username: post.author_username }}
                              className="text-sm font-semibold text-foreground hover:text-primary"
                            >
                              {post.author_display_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              @{post.author_username} · {formatReadableDate(post.created_at)}
                            </p>
                          </div>
                        </div>

                        {post.caption && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                            {post.caption}
                          </p>
                        )}

                        {post.image_url && (
                          <img
                            src={resolveMediaUrl(post.image_url) || ""}
                            alt="Post"
                            className="mt-3 max-h-96 w-full rounded-xl object-cover border border-border"
                          />
                        )}
                      </article>
                    ))
                  )}
                </div>
              )}

              {/* CHANNELS TAB */}
              {activeTab === "channels" && isApproved && (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <aside className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                      <h2 className="text-sm font-bold text-foreground">Channels</h2>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setShowCreateChannel((v) => !v)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/25"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New
                        </button>
                      )}
                    </div>

                    {showCreateChannel && canManage && (
                      <form
                        onSubmit={(e) => void handleCreateChannel(e)}
                        className="mt-3 space-y-2.5 rounded-xl border border-border bg-background/70 p-3"
                      >
                        <input
                          type="text"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="e.g., ride-planning"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          required
                        />
                        <input
                          type="text"
                          value={newChannelDesc}
                          onChange={(e) => setNewChannelDesc(e.target.value)}
                          placeholder="Channel topic (optional)"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            Channel Visibility
                          </label>
                          <select
                            value={newChannelVisibility}
                            onChange={(e) =>
                              setNewChannelVisibility(e.target.value as "member" | "administrator")
                            }
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground"
                          >
                            <option value="member">Member (All approved members)</option>
                            <option value="administrator">
                              Administrator (Founder & Admins only)
                            </option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingChannel}
                          className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
                        >
                          {creatingChannel ? "Creating..." : "Create Channel"}
                        </button>
                      </form>
                    )}

                    <div className="mt-3 space-y-4">
                      {canManage && adminChannels.length > 0 && (
                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                            <Lock className="h-3 w-3" />
                            Administration
                          </p>
                          <div className="space-y-1">
                            {adminChannels.map((ch) => (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => setSelectedChannelId(ch.id)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                                  selectedChannelId === ch.id
                                    ? "bg-primary/15 text-primary font-semibold"
                                    : "text-foreground/85 hover:bg-secondary",
                                )}
                              >
                                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                                <span className="truncate">{ch.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        {canManage && adminChannels.length > 0 && (
                          <p className="mb-1.5 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Members
                          </p>
                        )}
                        <div className="space-y-1">
                          {memberChannels.map((ch) => (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setSelectedChannelId(ch.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                                selectedChannelId === ch.id
                                  ? "bg-primary/15 text-primary font-semibold"
                                  : "text-foreground/85 hover:bg-secondary",
                              )}
                            >
                              <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{ch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card">
                    {selectedChannel ? (
                      <>
                        <div className="border-b border-border px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {(selectedChannel.visibility || "member").toLowerCase() ===
                            "administrator" ? (
                              <Lock className="h-4 w-4 text-amber-400" />
                            ) : (
                              <Hash className="h-4 w-4 text-primary" />
                            )}
                            <h3 className="text-base font-bold text-foreground">
                              {selectedChannel.name}
                            </h3>
                          </div>
                          {selectedChannel.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {selectedChannel.description}
                            </p>
                          )}
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-5 max-h-[420px]">
                          {messagesLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading messages...
                            </div>
                          ) : messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No messages in this channel yet. Start the conversation below.
                            </p>
                          ) : (
                            messages.map((m) => (
                              <div key={m.id} className="flex items-start gap-3">
                                {m.sender_avatar_url ? (
                                  <img
                                    src={resolveMediaUrl(m.sender_avatar_url) || ""}
                                    alt={m.sender_display_name}
                                    className="h-8 w-8 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                                    {(m.sender_display_name || m.sender_username || "R")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <Link
                                      to="/id/$username"
                                      params={{ username: m.sender_username }}
                                      className="text-sm font-semibold text-foreground hover:text-primary"
                                    >
                                      {m.sender_display_name}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">
                                      {formatReadableDate(m.created_at)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 whitespace-pre-line text-sm text-foreground/90">
                                    {m.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form
                          onSubmit={(e) => void handleSendChat(e)}
                          className="flex gap-2 border-t border-border p-4"
                        >
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={`Message #${selectedChannel.name}...`}
                            className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                          />
                          <button
                            type="submit"
                            disabled={sendingChat || !chatInput.trim()}
                            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            Send
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                        Select a channel to view messages.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EVENTS TAB */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  {(detail?.events ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                      No events scheduled for this club yet.
                    </div>
                  ) : (
                    detail!.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase",
                                  ev.status === "cancelled"
                                    ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                                    : ev.lifecycle_state === "past"
                                      ? "border-zinc-500/40 bg-zinc-500/15 text-zinc-300"
                                      : "border-primary/40 bg-primary/15 text-primary",
                                )}
                              >
                                {ev.status === "cancelled"
                                  ? "Cancelled"
                                  : ev.lifecycle_state === "past"
                                    ? "Past"
                                    : ev.lifecycle_state === "ongoing"
                                      ? "Ongoing"
                                      : "Upcoming"}
                              </span>
                            </div>
                            <h3 className="mt-2 text-lg font-bold text-foreground">{ev.title}</h3>
                            {ev.description && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {ev.description}
                              </p>
                            )}
                            <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                {formatReadableDate(ev.start_time)}
                              </span>
                              {ev.location_name && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-primary" />
                                  {ev.location_name}
                                </span>
                              )}
                              <span>
                                {ev.going_count} Going · {ev.tentative_count} Maybe
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {ev.active_share_token && (
                              <Link
                                to="/e/$token"
                                params={{ token: ev.active_share_token }}
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                              >
                                Open Event Page
                              </Link>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                disabled={sharingEventId === ev.id}
                                onClick={() => void handleShareEventLink(ev.id)}
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                                {ev.active_share_token ? "Copy View Link" : "Create View Link"}
                              </button>
                            )}
                          </div>
                        </div>

                        {isApproved && ev.status !== "cancelled" && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                            <button
                              type="button"
                              onClick={() => void handleRsvp(ev.id, "going")}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                ev.my_rsvp === "going"
                                  ? "border-emerald-500 bg-emerald-600 text-white"
                                  : "border-border bg-background text-foreground hover:border-emerald-500/50",
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Going
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRsvp(ev.id, "tentative")}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                ev.my_rsvp === "tentative" || ev.my_rsvp === "interested"
                                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                                  : "border-border bg-background text-foreground hover:border-amber-500/50",
                              )}
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              Maybe
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRsvp(ev.id, "not_going")}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                ev.my_rsvp === "not_going"
                                  ? "border-rose-500 bg-rose-500/20 text-rose-300"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Can't Go
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* THREADS TAB */}
              {activeTab === "threads" && (
                <div className="space-y-4">
                  {isApproved && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowThreadForm((v) => !v)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Start Discussion
                      </button>
                    </div>
                  )}

                  {showThreadForm && isApproved && (
                    <form
                      onSubmit={(e) => void handleCreateThread(e)}
                      className="space-y-3 rounded-2xl border border-border bg-card p-5"
                    >
                      <input
                        type="text"
                        value={threadTitle}
                        onChange={(e) => setThreadTitle(e.target.value)}
                        placeholder="Discussion title"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground"
                        required
                      />
                      <textarea
                        rows={3}
                        value={threadBody}
                        onChange={(e) => setThreadBody(e.target.value)}
                        placeholder="Share your thoughts, setup tips, or route questions..."
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowThreadForm(false)}
                          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingThread}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                        >
                          {creatingThread ? "Publishing..." : "Publish Thread"}
                        </button>
                      </div>
                    </form>
                  )}

                  {(detail?.threads ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                      No discussions started yet.
                    </div>
                  ) : (
                    detail!.threads.map((th) => (
                      <article
                        key={th.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                      >
                        <h3 className="text-base font-bold text-foreground">{th.title}</h3>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/85">
                          {th.body}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>By @{th.author_username}</span>
                          <span>·</span>
                          <span>{th.reply_count} replies</span>
                          <span>·</span>
                          <span>{formatReadableDate(th.created_at)}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === "members" && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(detail?.members ?? [])
                    .filter((m) => isApprovedMemberStatus(m.status))
                    .map((m) => (
                      <Link
                        key={m.user_id}
                        to="/id/$username"
                        params={{ username: m.username }}
                        className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
                      >
                        {m.avatar_url ? (
                          <img
                            src={resolveMediaUrl(m.avatar_url) || ""}
                            alt={m.display_name}
                            className="h-11 w-11 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                            {(m.display_name || m.username || "R").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {m.display_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                        </div>
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground/85">
                          {m.role}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
