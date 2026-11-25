import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { authRequest } from "@/lib/api";
import {
  addTripPlanCollaborator,
  createTripPlan,
  deleteTripPlan,
  fetchTripPlans,
  removeTripPlanCollaborator,
  reviewTripPlan,
  saveTripPlanChecklist,
  submitTripPlanForReview,
  updateTripPlan,
  type TripChecklistItem,
  type TripPlanItem,
  type TripPlanStatus,
} from "@/lib/api-trip-plans";
import { useAuth } from "@/lib/auth-context";
import { cn, getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/trip-planner")({
  head: () => ({
    meta: [{ title: "Trip Planner & Drafts — REVV" }],
  }),
  component: TripPlannerPage,
});

interface ClubOption {
  id: string;
  name: string;
}

const STATUS_BADGE: Record<TripPlanStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-secondary text-muted-foreground",
  },
  pending_review: {
    label: "Pending Moderator Review",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300",
  },
  needs_revision: {
    label: "Needs Revision",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
  },
};

function TripPlannerPage() {
  const { isAuthenticated, user } = useAuth();
  const [plans, setPlans] = useState<TripPlanItem[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "review">("mine");

  // Create / Edit form state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clubId, setClubId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [waypointsText, setWaypointsText] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Collaborator invite input per plan
  const [collabDrafts, setCollabDrafts] = useState<Record<string, string>>({});

  // Moderator review modal state
  const [reviewTarget, setReviewTarget] = useState<{
    plan: TripPlanItem;
    action: "revise" | "reject";
  } | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Local-first checklist state per plan (sent to backend only on Save)
  const [localChecklists, setLocalChecklists] = useState<Record<string, TripChecklistItem[]>>({});
  const [dirtyChecklists, setDirtyChecklists] = useState<Record<string, boolean>>({});
  const [newChecklistLabel, setNewChecklistLabel] = useState<Record<string, string>>({});
  const [savingChecklistId, setSavingChecklistId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [planList, clubList] = await Promise.all([
        fetchTripPlans(),
        authRequest<ClubOption[]>("/communities").catch(() => []),
      ]);
      setPlans(planList);
      setClubs(Array.isArray(clubList) ? clubList : []);
      setLocalChecklists((prev) => {
        const next = { ...prev };
        for (const p of planList) {
          if (!dirtyChecklists[p.id]) {
            next[p.id] = Array.isArray(p.checklist_items) ? p.checklist_items : [];
          }
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load trip plans."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, dirtyChecklists]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const pendingReviewPlans = useMemo(
    () => plans.filter((p) => p.can_review && p.status === "pending_review"),
    [plans],
  );
  const myPlans = useMemo(() => {
    if (activeTab === "review") return pendingReviewPlans;
    return plans;
  }, [activeTab, pendingReviewPlans, plans]);

  const openCreateForm = () => {
    setEditingId(null);
    setClubId(clubs[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setDepartureDate("");
    setMeetingPoint("");
    setDestinationName("");
    setWaypointsText("");
    setNotes("");
    setEditorOpen(true);
  };

  const openEditForm = (plan: TripPlanItem) => {
    setEditingId(plan.id);
    setClubId(plan.community_id ?? "");
    setTitle(plan.title);
    setDescription(plan.description ?? "");
    setDepartureDate(plan.departure_date ? plan.departure_date.slice(0, 16) : "");
    setMeetingPoint(plan.meeting_point ?? "");
    setDestinationName(plan.destination_name ?? "");
    setWaypointsText(Array.isArray(plan.waypoints) ? plan.waypoints.join("\n") : "");
    setNotes(plan.notes ?? "");
    setEditorOpen(true);
  };

  const handleSavePlan = async (submitForReview: boolean) => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setError("Trip plan title must be at least 3 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const waypoints = waypointsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const isoDate = departureDate ? new Date(departureDate).toISOString() : null;
    try {
      if (editingId) {
        await updateTripPlan(editingId, {
          title: cleanTitle,
          description: description.trim() || undefined,
          departure_date: isoDate,
          meeting_point: meetingPoint.trim() || undefined,
          destination_name: destinationName.trim() || undefined,
          waypoints,
          notes: notes.trim() || undefined,
        });
        if (submitForReview) {
          const res = await submitTripPlanForReview(editingId);
          setNotice(
            res.status === "approved"
              ? "Trip plan saved and approved."
              : "Trip plan submitted to club moderators for review.",
          );
        } else {
          setNotice("Trip plan draft updated.");
        }
      } else {
        const res = await createTripPlan({
          community_id: clubId || null,
          title: cleanTitle,
          description: description.trim() || undefined,
          departure_date: isoDate,
          meeting_point: meetingPoint.trim() || undefined,
          destination_name: destinationName.trim() || undefined,
          waypoints,
          notes: notes.trim() || undefined,
          submit_for_review: submitForReview,
        });
        setNotice(
          res.status === "pending_review"
            ? "Trip plan submitted! Club moderators have been notified."
            : res.status === "approved"
              ? "Club trip plan created and approved."
              : "Trip plan saved as draft.",
        );
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save trip plan."));
    } finally {
      setSaving(false);
    }
  };

  const handleInviteCollaborator = async (planId: string) => {
    const username = (collabDrafts[planId] ?? "").trim();
    if (!username) return;
    setError(null);
    try {
      const updated = await addTripPlanCollaborator(planId, username);
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, collaborators: updated } : p)),
      );
      setCollabDrafts((prev) => ({ ...prev, [planId]: "" }));
      setNotice(`Invited @${username.replace(/^@/, "")} as collaborator.`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not invite collaborator."));
    }
  };

  const handleRemoveCollaborator = async (planId: string, collabUserId: string) => {
    setError(null);
    try {
      await removeTripPlanCollaborator(planId, collabUserId);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, collaborators: p.collaborators.filter((c) => c.user_id !== collabUserId) }
            : p,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove collaborator."));
    }
  };

  const handleModeratorAction = async (
    planId: string,
    action: "approve" | "reject" | "revise",
    reason?: string,
  ) => {
    if (action === "revise" && (!reason || !reason.trim())) {
      setError("Please enter a revision reason explaining what needs to be updated.");
      return;
    }
    setSubmittingReview(true);
    setError(null);
    try {
      await reviewTripPlan(planId, action, reason?.trim() || undefined);
      setReviewTarget(null);
      setReviewReason("");
      setNotice(
        action === "approve"
          ? "Trip plan approved and creator notified."
          : action === "revise"
            ? "Revision request sent to creator and collaborators."
            : "Trip plan rejected and creator notified.",
      );
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit review decision."));
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleLocalChecklistItem = (planId: string, itemId: string) => {
    setLocalChecklists((prev) => ({
      ...prev,
      [planId]: (prev[planId] ?? []).map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    }));
    setDirtyChecklists((prev) => ({ ...prev, [planId]: true }));
  };

  const addLocalChecklistItem = (planId: string) => {
    const label = (newChecklistLabel[planId] ?? "").trim();
    if (!label) return;
    const item: TripChecklistItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      checked: false,
    };
    setLocalChecklists((prev) => ({
      ...prev,
      [planId]: [...(prev[planId] ?? []), item],
    }));
    setNewChecklistLabel((prev) => ({ ...prev, [planId]: "" }));
    setDirtyChecklists((prev) => ({ ...prev, [planId]: true }));
  };

  const removeLocalChecklistItem = (planId: string, itemId: string) => {
    setLocalChecklists((prev) => ({
      ...prev,
      [planId]: (prev[planId] ?? []).filter((item) => item.id !== itemId),
    }));
    setDirtyChecklists((prev) => ({ ...prev, [planId]: true }));
  };

  const handleSaveChecklist = async (planId: string) => {
    setSavingChecklistId(planId);
    setError(null);
    try {
      const items = localChecklists[planId] ?? [];
      await saveTripPlanChecklist(planId, items);
      setDirtyChecklists((prev) => ({ ...prev, [planId]: false }));
      setNotice("Checklist saved to server.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save checklist."));
    } finally {
      setSavingChecklistId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ClipboardList className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-black uppercase">Trip Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to create collaborative touring drafts, invite co-planners, and submit club trips
          for moderator review.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
            <MapPin className="size-3.5" />
            Collaborative Trip Planner
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Trip Plans &amp; Drafts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft routes with invited collaborators, submit club trips to moderators, and manage
            pre-ride checklists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
          >
            <Plus className="size-4" />
            New Trip Draft
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold transition",
            activeTab === "mine"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          All Drafts &amp; Plans ({plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
            activeTab === "review"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-3.5" />
          Moderator Review Queue
          {pendingReviewPlans.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
              {pendingReviewPlans.length}
            </span>
          )}
        </button>
      </div>

      {/* Create / Edit Draft Form */}
      {editorOpen && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-black uppercase">
              {editingId ? "Edit Trip Plan Draft" : "Create Trip Plan Draft"}
            </h2>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Trip Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday Morning Puncak Pass Run"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Club (Optional — required for Moderator Review)
                </label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Personal Draft (No Club)</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Meeting Point
              </label>
              <input
                type="text"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="Shell Senayan / Rest Area KM 10"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Destination
              </label>
              <input
                type="text"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="Rindu Alam / Kopi Daong"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Departure Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Waypoints / Stops (one per line)
              </label>
              <textarea
                rows={2}
                value={waypointsText}
                onChange={(e) => setWaypointsText(e.target.value)}
                placeholder={"Fuel Stop Cibubur\nPhoto Spot Puncak Pass"}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              Description &amp; Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pace group, intercom channel, mandatory riding gear..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePlan(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              Save Draft
            </button>
            {clubId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSavePlan(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send className="size-3.5" />
                Save &amp; Submit to Moderators
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading trip plans…</div>
      ) : myPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {activeTab === "review"
              ? "No trip plans waiting for moderator review."
              : "No trip drafts yet. Start planning your next ride!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myPlans.map((plan) => {
            const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE.draft;
            const checklist = localChecklists[plan.id] ?? [];
            const isChecklistDirty = Boolean(dirtyChecklists[plan.id]);
            const isCreator = user?.id === plan.creator_id;
            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                      {plan.community_name && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                          <Users className="size-3" />
                          {plan.community_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        by @{plan.creator_username}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-black text-foreground">
                      {plan.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {plan.departure_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5 text-primary" />
                          {new Date(plan.departure_date).toLocaleString()}
                        </span>
                      )}
                      {plan.meeting_point && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-emerald-500" />
                          Meet: {plan.meeting_point}
                        </span>
                      )}
                      {plan.destination_name && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" />
                          Dest: {plan.destination_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {plan.can_edit && (
                      <button
                        type="button"
                        onClick={() => openEditForm(plan)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80"
                      >
                        <Edit3 className="size-3.5" />
                        Edit
                      </button>
                    )}
                    {plan.can_edit &&
                      plan.community_id &&
                      (plan.status === "draft" || plan.status === "needs_revision") && (
                        <button
                          type="button"
                          onClick={() =>
                            void submitTripPlanForReview(plan.id)
                              .then(() => {
                                setNotice("Submitted to club moderators for review.");
                                return loadAll();
                              })
                              .catch((err) => setError(getErrorMessage(err, "Submit failed.")))
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                        >
                          <Send className="size-3.5" />
                          {plan.status === "needs_revision" ? "Resubmit" : "Submit to Mods"}
                        </button>
                      )}
                    {(isCreator || plan.can_review) && (
                      <button
                        type="button"
                        onClick={() =>
                          void deleteTripPlan(plan.id)
                            .then(() => loadAll())
                            .catch((err) => setError(getErrorMessage(err, "Delete failed.")))
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Moderator Revision / Rejection Reason Callout */}
                {plan.review_note &&
                  (plan.status === "needs_revision" || plan.status === "rejected") && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px]">
                          Moderator Feedback
                        </p>
                        <p className="mt-0.5 text-sm">{plan.review_note}</p>
                      </div>
                    </div>
                  )}

                {plan.notes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
                )}

                {Array.isArray(plan.waypoints) && plan.waypoints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {plan.waypoints.map((wp, i) => (
                      <span
                        key={`${plan.id}-wp-${i}`}
                        className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        Stop {i + 1}: {wp}
                      </span>
                    ))}
                  </div>
                )}

                {/* Moderator Review Controls */}
                {plan.can_review && plan.status === "pending_review" && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 mr-auto">
                      Moderator Decision Required:
                    </span>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => void handleModeratorAction(plan.id, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => {
                        setReviewTarget({ plan, action: "revise" });
                        setReviewReason("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                    >
                      <Edit3 className="size-3.5" />
                      Revise
                    </button>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => {
                        setReviewTarget({ plan, action: "reject" });
                        setReviewReason("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
                    >
                      <XCircle className="size-3.5" />
                      Reject
                    </button>
                  </div>
                )}

                {/* Collaborators Section */}
                <div className="border-t border-border/60 pt-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Collaborators ({plan.collaborators.length})
                    </span>
                    {(isCreator || plan.can_review) && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={collabDrafts[plan.id] ?? ""}
                          onChange={(e) =>
                            setCollabDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))
                          }
                          placeholder="@username"
                          className="w-36 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => void handleInviteCollaborator(plan.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-foreground hover:bg-secondary/80"
                        >
                          <UserPlus className="size-3.5" />
                          Invite
                        </button>
                      </div>
                    )}
                  </div>
                  {plan.collaborators.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {plan.collaborators.map((c) => (
                        <span
                          key={c.user_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-2.5 py-0.5 text-xs font-medium text-foreground"
                        >
                          @{c.username}
                          {(isCreator || plan.can_review || user?.id === c.user_id) && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveCollaborator(plan.id, c.user_id)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Local-First Personal Checklist (syncs to backend on Save) */}
                <div className="border-t border-border/60 pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Pre-Ride Checklist ({checklist.filter((i) => i.checked).length}/
                      {checklist.length})
                    </span>
                    {isChecklistDirty && (
                      <button
                        type="button"
                        disabled={savingChecklistId === plan.id}
                        onClick={() => void handleSaveChecklist(plan.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Save className="size-3" />
                        {savingChecklistId === plan.id ? "Saving…" : "Save Checklist"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => toggleLocalChecklistItem(plan.id, item.id)}
                          className="flex items-center gap-2 text-left flex-1"
                        >
                          {item.checked ? (
                            <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="size-4 text-muted-foreground shrink-0" />
                          )}
                          <span
                            className={cn(
                              "text-foreground",
                              item.checked && "line-through text-muted-foreground",
                            )}
                          >
                            {item.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLocalChecklistItem(plan.id, item.id)}
                          className="text-muted-foreground hover:text-red-500 p-1"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newChecklistLabel[plan.id] ?? ""}
                      onChange={(e) =>
                        setNewChecklistLabel((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLocalChecklistItem(plan.id);
                        }
                      }}
                      placeholder="Add checklist item (e.g. Tire pressure, Raincoat, Intercom)..."
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => addLocalChecklistItem(plan.id)}
                      className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Moderator Revise / Reject Reason Modal */}
      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-lg font-black uppercase text-foreground">
              {reviewTarget.action === "revise"
                ? "Request Revision on Trip Plan"
                : "Reject Trip Plan"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {reviewTarget.action === "revise"
                ? `Explain what needs to be updated on "${reviewTarget.plan.title}". This note will be sent directly to the creator and collaborators.`
                : `Optional reason for rejecting "${reviewTarget.plan.title}".`}
            </p>
            <textarea
              rows={3}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder="Misal: meeting point & jam keberangkatan belum lengkap..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={() =>
                  void handleModeratorAction(
                    reviewTarget.plan.id,
                    reviewTarget.action,
                    reviewReason,
                  )
                }
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold",
                  reviewTarget.action === "revise"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "bg-red-600 text-white hover:bg-red-500",
                )}
              >
                {submittingReview
                  ? "Sending…"
                  : reviewTarget.action === "revise"
                    ? "Send Revision Request"
                    : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
