import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, RefreshCw, Send } from "lucide-react";
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportPurposes,
  replySupportTicket,
  type SupportPurposeItem,
  type UserSupportTicketItem,
} from "@/lib/api-rider";
import { formatRelativeTime } from "@/lib/date";

export function SupportDeskPanel() {
  const [purposes, setPurposes] = useState<SupportPurposeItem[]>([]);
  const [tickets, setTickets] = useState<UserSupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [purposeId, setPurposeId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pList, tList] = await Promise.all([
        fetchSupportPurposes().catch(() => []),
        fetchMySupportTickets(),
      ]);
      setPurposes(pList);
      setTickets(tList);
      const firstPurpose = pList[0];
      if (firstPurpose) {
        setPurposeId((prev) => prev || firstPurpose.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await createSupportTicket({
        ...(purposeId ? { purpose_id: purposeId } : {}),
        ...(phoneNumber.trim() ? { phone_number: phoneNumber.trim() } : {}),
        message: message.trim(),
      });
      setMessage("");
      setNotice("Support ticket submitted. Our operations desk will respond here.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(ticketId: string) {
    const text = (replyText[ticketId] ?? "").trim();
    if (!text) return;
    setReplyBusyId(ticketId);
    setError(null);
    try {
      await replySupportTicket(ticketId, text);
      setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setReplyBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={(e) => void handleCreateTicket(e)}
        className="rounded-2xl border border-border bg-card p-5 space-y-4 h-fit"
      >
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">New Support Request</h2>
        </div>

        {notice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}

        <div>
          <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
            Category
          </label>
          <select
            value={purposeId}
            onChange={(e) => setPurposeId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground"
          >
            {purposes.length === 0 ? (
              <option value="">General Inquiry</option>
            ) : (
              purposes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
            Phone / WhatsApp (Optional)
          </label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+62…"
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
            Describe Your Issue
          </label>
          <textarea
            required
            rows={4}
            maxLength={320}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share details, device model, or ride session context…"
            className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="btn-primary w-full min-h-[44px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="size-4" />
          {submitting ? "Sending…" : "Submit Ticket"}
        </button>
      </form>

      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">
            Your Support Tickets ({tickets.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary/50"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between gap-3">
            <span className="text-xs text-destructive">{error}</span>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl border border-border bg-card animate-pulse" />
            <div className="h-28 rounded-2xl border border-border bg-card animate-pulse" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            You have no support tickets yet.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {t.reference_code}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{t.purpose_label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                      {t.status}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatRelativeTime(t.created_at)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line">{t.message}</p>

                {t.admin_reply && (!t.messages || t.messages.length === 0) && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
                    <div className="font-mono text-[10px] uppercase text-primary mb-1">
                      Support Desk Reply
                    </div>
                    <p className="text-foreground">{t.admin_reply}</p>
                  </div>
                )}

                {t.messages && t.messages.length > 0 && (
                  <div className="space-y-2 border-t border-border/60 pt-2">
                    {t.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl px-3 py-2 text-xs ${
                          m.sender_role === "user"
                            ? "bg-secondary/40 text-foreground"
                            : "border border-primary/30 bg-primary/5 text-foreground"
                        }`}
                      >
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-0.5">
                          <span>
                            {m.sender_name || (m.sender_role === "user" ? "You" : "Support Desk")}
                          </span>
                          <span>{formatRelativeTime(m.created_at)}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {t.can_user_reply !== false && t.status.toLowerCase() !== "closed" && (
                  <div className="flex gap-2 pt-1">
                    <input
                      maxLength={320}
                      value={replyText[t.id] ?? ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Write a follow-up…"
                      className="flex-1 min-h-[40px] rounded-xl border border-border bg-secondary/40 px-3 text-xs text-foreground"
                    />
                    <button
                      type="button"
                      disabled={replyBusyId === t.id || !(replyText[t.id] ?? "").trim()}
                      onClick={() => void handleSendReply(t.id)}
                      className="min-h-[40px] rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold disabled:opacity-50"
                    >
                      {replyBusyId === t.id ? "Sending…" : "Reply"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
