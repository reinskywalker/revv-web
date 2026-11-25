import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  acceptFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  rejectFriendRequest,
  resolveMediaUrl,
  searchRiders,
  sendFriendRequest,
  type FriendRequestItem,
  type FriendUserItem,
  type SocialRiderSearchResult,
} from "@/lib/api";
import {
  fetchDirectConversations,
  fetchDirectMessages,
  sendDirectMessage,
  type DirectConversationItem,
  type DirectMessageItem,
} from "@/lib/api-rider";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/date";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [{ title: "Messages & Friends — REVV" }],
  }),
  component: MessagesPage,
});

interface ActiveChatPeer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null | undefined;
}

function MessagesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [sidebarTab, setSidebarTab] = useState<"chats" | "friends" | "requests" | "find">("chats");

  const [conversations, setConversations] = useState<DirectConversationItem[]>([]);
  const [friends, setFriends] = useState<FriendUserItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialRiderSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const [activePeer, setActivePeer] = useState<ActiveChatPeer | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSocialData = useCallback(async () => {
    setSidebarLoading(true);
    setSidebarError(null);
    try {
      const [convList, friendList, reqList] = await Promise.all([
        fetchDirectConversations(),
        fetchFriends(),
        fetchFriendRequests(),
      ]);
      setConversations(convList);
      setFriends(friendList);
      setRequests(reqList);
    } catch (err) {
      setSidebarError(err instanceof Error ? err.message : "Failed to load inbox.");
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  const activePeerIdRef = useRef<string | null>(null);
  const pollRequestSeqRef = useRef(0);

  const loadMessages = useCallback(async (peerId: string, silent = false) => {
    const requestSeq = ++pollRequestSeqRef.current;
    if (!silent) setChatLoading(true);
    setChatError(null);
    try {
      const list = await fetchDirectMessages(peerId, 60);
      if (activePeerIdRef.current !== peerId || pollRequestSeqRef.current !== requestSeq) {
        return;
      }
      setMessages(list);
    } catch (err) {
      if (!silent && activePeerIdRef.current === peerId) {
        setChatError(getErrorMessage(err, "Failed to load thread."));
      }
    } finally {
      if (!silent && activePeerIdRef.current === peerId) {
        setChatLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadSocialData();
  }, [isAuthenticated, loadSocialData]);

  // Foreground-only 5s polling for the open DM thread
  useEffect(() => {
    activePeerIdRef.current = activePeer?.id ?? null;
    if (!isAuthenticated || !activePeer) return;
    void loadMessages(activePeer.id);

    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (document.visibilityState === "hidden") return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState !== "hidden") {
          void loadMessages(activePeer.id, true);
        }
      }, 5000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } else {
        void loadMessages(activePeer.id, true);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAuthenticated, activePeer, loadMessages]);

  async function handleSearchRiders(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSidebarError(null);
    try {
      const results = await searchRiders(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setSidebarError(err instanceof Error ? err.message : "Rider search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activePeer || !draft.trim() || sending) return;
    setSending(true);
    setChatError(null);
    try {
      const sent = await sendDirectMessage(activePeer.id, draft.trim());
      setDraft("");
      setMessages((prev) => [...prev, sent]);
      void fetchDirectConversations()
        .then(setConversations)
        .catch(() => {});
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

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
        <MessageSquare className="size-10 mx-auto text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">
          Direct Messages & Friends
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to chat with riding friends, manage friend requests, and discover fellow riders.
        </p>
        <Link to="/login" className="btn-primary inline-flex min-h-[44px] items-center px-6">
          Sign In
        </Link>
      </div>
    );
  }

  const incomingRequests = requests.filter((r) => !r.is_outgoing);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-primary">
            Rider Comms
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Messages & Friends
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadSocialData()}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-semibold hover:bg-secondary/50"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </header>

      {sidebarError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-destructive">{sidebarError}</span>
          <button
            type="button"
            onClick={() => void loadSocialData()}
            className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-5 rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-4 gap-1 rounded-full border border-border bg-secondary/30 p-1">
            {(
              [
                { id: "chats", label: "Inbox" },
                { id: "friends", label: `Friends` },
                {
                  id: "requests",
                  label: incomingRequests.length > 0 ? `Req (${incomingRequests.length})` : "Req",
                },
                { id: "find", label: "Find" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSidebarTab(t.id)}
                className={`min-h-[38px] rounded-full text-xs font-semibold transition-colors ${
                  sidebarTab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {sidebarTab === "find" && (
            <div className="space-y-3">
              <form onSubmit={(e) => void handleSearchRiders(e)} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search @username or rider…"
                    className="w-full min-h-[42px] rounded-full border border-border bg-secondary/30 pl-9 pr-3 text-xs text-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="min-h-[42px] rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold"
                >
                  {searching ? "…" : "Find"}
                </button>
              </form>

              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border/70 bg-secondary/20 p-3 flex items-center justify-between gap-2"
                  >
                    <Link
                      to="/id/$username"
                      params={{ username: r.username }}
                      className="min-w-0 hover:text-primary"
                    >
                      <div className="text-xs font-semibold text-foreground truncate">
                        {r.display_name || r.username}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        @{r.username}
                      </div>
                    </Link>
                    {r.friendship_status === "friends" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePeer({
                            id: r.id,
                            username: r.username,
                            displayName: r.display_name || r.username,
                            avatarUrl: r.avatar_url,
                          })
                        }
                        className="min-h-[36px] rounded-full border border-primary/40 px-3 text-xs text-primary"
                      >
                        Message
                      </button>
                    ) : r.friendship_status === "none" ? (
                      <button
                        type="button"
                        disabled={busyActionId === r.id}
                        onClick={async () => {
                          setBusyActionId(r.id);
                          try {
                            await sendFriendRequest(r.id);
                            setSearchResults((prev) =>
                              prev.map((x) =>
                                x.id === r.id ? { ...x, friendship_status: "outgoing_request" } : x,
                              ),
                            );
                          } catch (err) {
                            setSidebarError(getErrorMessage(err, "Could not send friend request."));
                          } finally {
                            setBusyActionId(null);
                          }
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 text-xs font-semibold"
                      >
                        <UserPlus className="size-3.5" /> Add
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-muted-foreground">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarLoading && sidebarTab !== "find" ? (
            <div className="space-y-2">
              <div className="h-16 rounded-xl bg-secondary/20 animate-pulse" />
              <div className="h-16 rounded-xl bg-secondary/20 animate-pulse" />
            </div>
          ) : sidebarTab === "chats" ? (
            conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No direct message conversations yet. Pick a friend to start chatting.
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {conversations.map((c) => (
                  <button
                    key={c.other_user_id}
                    type="button"
                    onClick={() =>
                      setActivePeer({
                        id: c.other_user_id,
                        username: c.username,
                        displayName: c.display_name || c.username,
                        avatarUrl: c.avatar_url,
                      })
                    }
                    className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      activePeer?.id === c.other_user_id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <RevvAvatar src={c.avatar_url} name={c.display_name || c.username} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {c.display_name || `@${c.username}`}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.last_message || "Open conversation"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : sidebarTab === "friends" ? (
            friends.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Users className="size-7 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No friends connected yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {friends.map((f) => (
                  <div
                    key={f.friend_id}
                    className="rounded-xl border border-border/70 bg-secondary/20 p-3 flex items-center justify-between gap-2"
                  >
                    <Link
                      to="/id/$username"
                      params={{ username: f.username }}
                      className="min-w-0 hover:text-primary"
                    >
                      <div className="text-xs font-semibold text-foreground truncate">
                        {f.display_name || f.username}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        @{f.username}
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePeer({
                          id: f.friend_id,
                          username: f.username,
                          displayName: f.display_name || f.username,
                          avatarUrl: f.avatar_url,
                        })
                      }
                      className="min-h-[36px] rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : sidebarTab === "requests" ? (
            incomingRequests.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <UserCheck className="size-7 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No pending incoming requests.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border/70 bg-secondary/20 p-3 flex items-center justify-between gap-2"
                  >
                    <Link
                      to="/id/$username"
                      params={{ username: req.username }}
                      className="min-w-0 hover:text-primary"
                    >
                      <div className="text-xs font-semibold text-foreground truncate">
                        {req.display_name || req.username}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        @{req.username}
                      </div>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyActionId === req.id}
                        aria-label={`Accept ${req.username}`}
                        onClick={async () => {
                          setBusyActionId(req.id);
                          try {
                            await acceptFriendRequest(req.id);
                            await loadSocialData();
                          } catch (err) {
                            setSidebarError(getErrorMessage(err, "Could not accept request."));
                          } finally {
                            setBusyActionId(null);
                          }
                        }}
                        className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busyActionId === req.id}
                        aria-label={`Decline ${req.username}`}
                        onClick={async () => {
                          setBusyActionId(req.id);
                          try {
                            await rejectFriendRequest(req.id);
                            await loadSocialData();
                          } catch (err) {
                            setSidebarError(getErrorMessage(err, "Could not decline request."));
                          } finally {
                            setBusyActionId(null);
                          }
                        }}
                        className="inline-flex size-9 items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </aside>

        <section className="lg:col-span-7 rounded-2xl border border-border bg-card flex flex-col min-h-[480px] max-h-[640px]">
          {!activePeer ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <MessageSquare className="size-9 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choose a thread from Inbox or message a friend directly.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
                <Link
                  to="/id/$username"
                  params={{ username: activePeer.username }}
                  className="hover:text-primary"
                >
                  <div className="font-display text-sm font-bold text-foreground">
                    {activePeer.displayName}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    @{activePeer.username}
                  </div>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {chatError && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {chatError}
                  </div>
                )}
                {chatLoading ? (
                  <div className="h-24 rounded-xl bg-secondary/20 animate-pulse" />
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs space-y-1 ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/60 text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                          <div
                            className={`text-[10px] font-mono ${
                              isMine ? "text-primary-foreground/75" : "text-muted-foreground"
                            }`}
                          >
                            {formatRelativeTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => void handleSend(e)}
                className="border-t border-border p-3 flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  placeholder={`Message @${activePeer.username}…`}
                  className="flex-1 min-h-[44px] rounded-full border border-border bg-secondary/30 px-4 text-xs text-foreground"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 text-xs font-semibold disabled:opacity-50"
                >
                  <Send className="size-3.5" /> Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
