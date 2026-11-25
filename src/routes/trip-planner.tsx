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
import { TripMapPicker, type MapPoint } from "@/components/revv/TripMapPicker";
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
  type TripChecklistSection,
  type TripPlanItem,
  type TripPlanStatus,
  type TripWaypointStop,
} from "@/lib/api-trip-plans";
import { useAuth } from "@/lib/auth-context";
import { cn, getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/trip-planner")({
  head: () => ({
    meta: [{ title: "Trip Planner & Drafts — REVV" }],
  }),
  component: TripPlannerPage,
});

const MAX_SECTIONS = 5;
const MAX_ITEMS_PER_SECTION = 10;

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

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeWaypointsList(raw: TripPlanItem["waypoints"]): TripWaypointStop[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): TripWaypointStop | null => {
      if (typeof entry === "string") {
        return entry.trim() ? { name: entry.trim() } : null;
      }
      if (entry && typeof entry === "object" && entry.name) {
        return {
          name: entry.name,
          lat: typeof entry.lat === "number" ? entry.lat : null,
          lng: typeof entry.lng === "number" ? entry.lng : null,
        };
      }
      return null;
    })
    .filter((x): x is TripWaypointStop => x !== null);
}

function TripPlannerPage() {
  const { isAuthenticated, user } = useAuth();
  const [plans, setPlans] = useState<TripPlanItem[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "review">("mine");

  // Create / Edit form state with coordinates
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clubId, setClubId] = useState("");
  const [title, setTitle] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [meeting, setMeeting] = useState<MapPoint | null>(null);
  const [meetingNameInput, setMeetingNameInput] = useState("");
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [destinationNameInput, setDestinationNameInput] = useState("");
  const [waypoints, setWaypoints] = useState<TripWaypointStop[]>([]);
  const [notes, setNotes] = useState("");
  const [editorSections, setEditorSections] = useState<TripChecklistSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
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

  // Local-first sectioned checklists per plan (synced explicitly on Save)
  const [localChecklists, setLocalChecklists] = useState<Record<string, TripChecklistSection[]>>({});
  const [dirtyChecklists, setDirtyChecklists] = useState<Record<string, boolean>>({});
  const [newSectionDrafts, setNewSectionDrafts] = useState<Record<string, string>>({});
  const [newItemDrafts, setNewItemDrafts] = useState<Record<string, string>>({});
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
            next[p.id] = Array.isArray(p.checklist_sections) ? p.checklist_sections : [];
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
  const visiblePlans = useMemo(() => {
    if (activeTab === "review") return pendingReviewPlans;
    return plans;
  }, [activeTab, pendingReviewPlans, plans]);

  const openCreateForm = () => {
    setEditingId(null);
    setClubId(clubs[0]?.id ?? "");
    setTitle("");
    setDepartureDate("");
    setMeeting(null);
    setMeetingNameInput("");
    setDestination(null);
    setDestinationNameInput("");
    setWaypoints([]);
    setNotes("");
    setEditorSections([{ id: uid("sec"), title: "Medical", items: [] }]);
    setNewSectionTitle("");
    setEditorOpen(true);
  };

  const openEditForm = (plan: TripPlanItem) => {
    setEditingId(plan.id);
    setClubId(plan.community_id ?? "");
    setTitle(plan.title);
    setDepartureDate(plan.departure_date ? plan.departure_date.slice(0, 16) : "");
    if (typeof plan.meeting_lat === "number" && typeof plan.meeting_lng === "number") {
      setMeeting({
        name: plan.meeting_point ?? "Meeting Point",
        lat: plan.meeting_lat,
        lng: plan.meeting_lng,
      });
    } else {
      setMeeting(null);
    }
    setMeetingNameInput(plan.meeting_point ?? "");
    if (typeof plan.destination_lat === "number" && typeof plan.destination_lng === "number") {
      setDestination({
        name: plan.destination_name ?? "Destination",
        lat: plan.destination_lat,
        lng: plan.destination_lng,
      });
    } else {
      setDestination(null);
    }
    setDestinationNameInput(plan.destination_name ?? "");
    setWaypoints(normalizeWaypointsList(plan.waypoints));
    setNotes(plan.notes ?? "");
    setEditorSections(Array.isArray(plan.checklist_sections) ? plan.checklist_sections : []);
    setEditorOpen(true);
  };

  const handleSavePlan = async (submitForReview: boolean) => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setError("Trip plan title must be at least 3 characters.");
      return;
    }
    if (!meeting || !destination) {
      setError("Pick both a Meeting Point and Destination pin on the map so Mobile can render the route thumbnail.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const isoDate = departureDate ? new Date(departureDate).toISOString() : null;
    try {
      if (editingId) {
        await updateTripPlan(editingId, {
          title: cleanTitle,
          departure_date: isoDate,
          meeting_point: meetingNameInput.trim() || meeting.name,
          meeting_lat: meeting.lat,
          meeting_lng: meeting.lng,
          destination_name: destinationNameInput.trim() || destination.name,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          waypoints,
          notes: notes.trim() || undefined,
        });
        await saveTripPlanChecklist(editingId, editorSections);
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
          departure_date: isoDate,
          meeting_point: meetingNameInput.trim() || meeting.name,
          meeting_lat: meeting.lat,
          meeting_lng: meeting.lng,
          destination_name: destinationNameInput.trim() || destination.name,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          waypoints,
          notes: notes.trim() || undefined,
          submit_for_review: submitForReview,
          checklist_sections: editorSections.filter((s) => s.title.trim().length > 0),
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

  const updatePlanSections = (
    planId: string,
    updater: (prev: TripChecklistSection[]) => TripChecklistSection[],
  ) => {
    setLocalChecklists((prev) => ({
      ...prev,
      [planId]: updater(prev[planId] ?? []),
    }));
    setDirtyChecklists((prev) => ({ ...prev, [planId]: true }));
  };

  const handleAddCardSection = (planId: string) => {
    const label = (newSectionDrafts[planId] ?? "").trim();
    if (!label) return;
    const current = localChecklists[planId] ?? [];
    if (current.length >= MAX_SECTIONS) {
      setError(`Maximum ${MAX_SECTIONS} checklist sections allowed per trip plan.`);
      return;
    }
    updatePlanSections(planId, (prev) => [...prev, { id: uid("sec"), title: label, items: [] }]);
    setNewSectionDrafts((prev) => ({ ...prev, [planId]: "" }));
  };

  const handleAddCardItem = (planId: string, sectionId: string) => {
    const key = `${planId}:${sectionId}`;
    const label = (newItemDrafts[key] ?? "").trim();
    if (!label) return;
    const currentSec = (localChecklists[planId] ?? []).find((s) => s.id === sectionId);
    if (currentSec && currentSec.items.length >= MAX_ITEMS_PER_SECTION) {
      setError(`Maximum ${MAX_ITEMS_PER_SECTION} checkboxes per section.`);
      return;
    }
    const newItem: TripChecklistItem = { id: uid("chk"), label, checked: false };
    updatePlanSections(planId, (prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s)),
    );
    setNewItemDrafts((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSaveChecklist = async (planId: string) => {
    setSavingChecklistId(planId);
    setError(null);
    try {
      const sections = localChecklists[planId] ?? [];
      await saveTripPlanChecklist(planId, sections);
      setDirtyChecklists((prev) => ({ ...prev, [planId]: false }));
      setNotice("Sectioned checklist saved to backend.");
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
          Sign in to pick touring waypoints on the map, build 5×10 checklists, invite
          collaborators, and submit club trips for moderator review.
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
            <MapPin className="size-3.5" />
            Map &amp; Checklist Planner
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Trip Plans &amp; Drafts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick real GPS pins for Mobile map thumbnails, create sectioned checklists (max 5
            sections × 10 items), and collaborate with moderators.
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

      {editorOpen && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-5">
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
                Meeting Point Label
              </label>
              <input
                type="text"
                value={meetingNameInput}
                onChange={(e) => setMeetingNameInput(e.target.value)}
                placeholder="Pick on map below or customize label"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Destination Label
              </label>
              <input
                type="text"
                value={destinationNameInput}
                onChange={(e) => setDestinationNameInput(e.target.value)}
                placeholder="Pick on map below or customize label"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          <TripMapPicker
            meeting={meeting}
            destination={destination}
            waypoints={waypoints
              .filter((w): w is MapPoint & TripWaypointStop => typeof w.lat === "number" && typeof w.lng === "number")
              .map((w) => ({ name: w.name, lat: w.lat!, lng: w.lng! }))}
            onPickMeeting={(pt) => {
              setMeeting(pt);
              setMeetingNameInput(pt.name);
            }}
            onPickDestination={(pt) => {
              setDestination(pt);
              setDestinationNameInput(pt.name);
            }}
            onAddWaypoint={(pt) =>
              setWaypoints((prev) => [...prev.slice(0, 19), { name: pt.name, lat: pt.lat, lng: pt.lng }])
            }
          />

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Meeting GPS:{" "}
              <strong className="text-foreground">
                {meeting ? `${meeting.lat.toFixed(4)}, ${meeting.lng.toFixed(4)}` : "Not pinned"}
              </strong>
            </span>
            <span>
              Dest GPS:{" "}
              <strong className="text-foreground">
                {destination
                  ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                  : "Not pinned"}
              </strong>
            </span>
            {waypoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {waypoints.map((wp, idx) => (
                  <span
                    key={`ed-wp-${idx}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    Stop {idx + 1}: {wp.name}
                    <button
                      type="button"
                      onClick={() => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
                      className="hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sectioned Checklist Builder in Form */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Checklist Sections ({editorSections.length}/{MAX_SECTIONS}) — max{" "}
                {MAX_ITEMS_PER_SECTION} boxes each
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Section name (e.g. Medical)..."
                  className="w-44 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                />
                <button
                  type="button"
                  disabled={editorSections.length >= MAX_SECTIONS}
                  onClick={() => {
                    const clean = newSectionTitle.trim();
                    if (!clean || editorSections.length >= MAX_SECTIONS) return;
                    setEditorSections((prev) => [...prev, { id: uid("sec"), title: clean, items: [] }]);
                    setNewSectionTitle("");
                  }}
                  className="rounded-lg bg-secondary px-3 py-1 text-xs font-bold text-foreground disabled:opacity-40"
                >
                  + Add Section
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {editorSections.map((sec) => (
                <EditorSectionCard
                  key={sec.id}
                  section={sec}
                  onRemoveSection={() =>
                    setEditorSections((prev) => prev.filter((s) => s.id !== sec.id))
                  }
                  onAddItem={(label) =>
                    setEditorSections((prev) =>
                      prev.map((s) =>
                        s.id === sec.id && s.items.length < MAX_ITEMS_PER_SECTION
                          ? { ...s, items: [...s.items, { id: uid("chk"), label, checked: false }] }
                          : s,
                      ),
                    )
                  }
                  onRemoveItem={(itemId) =>
                    setEditorSections((prev) =>
                      prev.map((s) =>
                        s.id === sec.id
                          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
                          : s,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              Notes / Briefing
            </label>
            <textarea
              rows={2}
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

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading trip plans…</div>
      ) : visiblePlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {activeTab === "review"
              ? "No trip plans waiting for moderator review."
              : "No trip drafts yet. Pick your route pins and start planning!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePlans.map((plan) => {
            const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE.draft;
            const sections = localChecklists[plan.id] ?? [];
            const isChecklistDirty = Boolean(dirtyChecklists[plan.id]);
            const isCreator = user?.id === plan.creator_id;
            const stops = normalizeWaypointsList(plan.waypoints);

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

                {stops.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stops.map((wp, i) => (
                      <span
                        key={`${plan.id}-wp-${i}`}
                        className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        Stop {i + 1}: {wp.name}
                      </span>
                    ))}
                  </div>
                )}

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

                {/* Sectioned Checklists (Max 5 sections x 10 checkboxes) */}
                <div className="border-t border-border/60 pt-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Pre-Ride Checklists ({sections.length}/{MAX_SECTIONS} sections)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newSectionDrafts[plan.id] ?? ""}
                        onChange={(e) =>
                          setNewSectionDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))
                        }
                        placeholder="New section (e.g. Medical)..."
                        className="w-44 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                      />
                      <button
                        type="button"
                        disabled={sections.length >= MAX_SECTIONS}
                        onClick={() => handleAddCardSection(plan.id)}
                        className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-40"
                      >
                        + Section
                      </button>
                      {isChecklistDirty && (
                        <button
                          type="button"
                          disabled={savingChecklistId === plan.id}
                          onClick={() => void handleSaveChecklist(plan.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Save className="size-3" />
                          {savingChecklistId === plan.id ? "Saving…" : "Save"}
                        </button>
                      )}
                    </div>
                  </div>

                  {sections.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sections.map((sec) => {
                        const inputKey = `${plan.id}:${sec.id}`;
                        return (
                          <div
                            key={sec.id}
                            className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black uppercase tracking-wide text-foreground">
                                {sec.title} ({sec.items.length}/{MAX_ITEMS_PER_SECTION})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updatePlanSections(plan.id, (prev) =>
                                    prev.filter((s) => s.id !== sec.id),
                                  )
                                }
                                className="text-muted-foreground hover:text-red-500 p-0.5"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              {sec.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-all duration-200",
                                    item.checked ? "bg-emerald-500/10 opacity-75" : "bg-background/70",
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updatePlanSections(plan.id, (prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                                ...s,
                                                items: s.items.map((i) =>
                                                  i.id === item.id
                                                    ? { ...i, checked: !i.checked }
                                                    : i,
                                                ),
                                              }
                                            : s,
                                        ),
                                      )
                                    }
                                    className="flex items-center gap-2 text-left flex-1"
                                  >
                                    {item.checked ? (
                                      <CheckSquare className="size-4 text-emerald-500 shrink-0 transition-transform duration-150 scale-105" />
                                    ) : (
                                      <Square className="size-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span
                                      className={cn(
                                        "text-foreground transition-opacity duration-200",
                                        item.checked && "line-through text-muted-foreground",
                                      )}
                                    >
                                      {item.label}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updatePlanSections(plan.id, (prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                                ...s,
                                                items: s.items.filter((i) => i.id !== item.id),
                                              }
                                            : s,
                                        ),
                                      )
                                    }
                                    className="text-muted-foreground hover:text-red-500 p-0.5"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={newItemDrafts[inputKey] ?? ""}
                                onChange={(e) =>
                                  setNewItemDrafts((prev) => ({
                                    ...prev,
                                    [inputKey]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCardItem(plan.id, sec.id);
                                  }
                                }}
                                disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                                placeholder="Add item..."
                                className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-40"
                              />
                              <button
                                type="button"
                                disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                                onClick={() => handleAddCardItem(plan.id, sec.id)}
                                className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

function EditorSectionCard({
  section,
  onRemoveSection,
  onAddItem,
  onRemoveItem,
}: {
  section: TripChecklistSection;
  onRemoveSection: () => void;
  onAddItem: (label: string) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase text-foreground">
          {section.title} ({section.items.length}/{MAX_ITEMS_PER_SECTION})
        </span>
        <button type="button" onClick={onRemoveSection} className="text-muted-foreground hover:text-red-500">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {section.items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-0.5 text-xs text-foreground"
          >
            {item.label}
            <button type="button" onClick={() => onRemoveItem(item.id)} className="hover:text-red-500">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onAddItem(draft.trim());
              setDraft("");
            }
          }}
          disabled={section.items.length >= MAX_ITEMS_PER_SECTION}
          placeholder="Add checkbox item..."
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
        />
        <button
          type="button"
          disabled={section.items.length >= MAX_ITEMS_PER_SECTION}
          onClick={() => {
            if (!draft.trim()) return;
            onAddItem(draft.trim());
            setDraft("");
          }}
          className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-foreground disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
