import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  FolderPlus,
  Loader2,
  MapPin,
  Plus,
  Route as RouteIcon,
  Save,
  Send,
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
  type TripChecklistSection,
  type TripPlanItem,
  type TripPlanStatus,
  type TripWaypointStop,
  updateTripPlan,
} from "@/lib/api-trip-plans";
import { useAuth } from "@/lib/auth-context";
import { canAccessAdmin, cn } from "@/lib/utils";
import { type MapPoint, TripMapPicker } from "@/components/revv/TripMapPicker";

export const Route = createFileRoute("/trip-planner")({
  component: TripPlannerPage,
});

const MAX_SECTIONS = 5;
const MAX_ITEMS_PER_SECTION = 10;

interface ClubOption {
  id: string;
  name: string;
  my_role?: string | null;
  can_create_event?: boolean;
}

const STATUS_META: Record<TripPlanStatus, { label: string; cls: string }> = {
  draft: {
    label: "Draft",
    cls: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
  pending_review: {
    label: "Pending Review",
    cls: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  needs_revision: {
    label: "Needs Revision",
    cls: "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  approved: {
    label: "Published",
    cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    cls: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
};

function makeLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeWaypoints(raw: Array<TripWaypointStop | string>): MapPoint[] {
  const out: MapPoint[] = [];
  for (const item of raw) {
    if (typeof item === "string") continue;
    if (
      item &&
      typeof item.lat === "number" &&
      typeof item.lng === "number" &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
    ) {
      out.push({ name: item.name || "Stop", lat: item.lat, lng: item.lng });
    }
  }
  return out;
}

function planMapPoints(plan: TripPlanItem): {
  meeting: MapPoint | null;
  destination: MapPoint | null;
  waypoints: MapPoint[];
} {
  const meeting =
    typeof plan.meeting_lat === "number" && typeof plan.meeting_lng === "number"
      ? { name: plan.meeting_point || "Start", lat: plan.meeting_lat, lng: plan.meeting_lng }
      : null;
  const destination =
    typeof plan.destination_lat === "number" && typeof plan.destination_lng === "number"
      ? {
          name: plan.destination_name || "Destination",
          lat: plan.destination_lat,
          lng: plan.destination_lng,
        }
      : null;
  return {
    meeting,
    destination,
    waypoints: normalizeWaypoints(plan.waypoints),
  };
}

function formatSubmittedDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countChecklistProgress(sections: TripChecklistSection[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const sec of sections) {
    total += sec.items.length;
    done += sec.items.filter((i) => i.checked).length;
  }
  return { done, total };
}

function TripPlannerPage() {
  const { isAuthenticated, user } = useAuth();
  const isGlobalModOrAdmin = canAccessAdmin(user?.role);

  const initialSearch = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const [plans, setPlans] = useState<TripPlanItem[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "review">(
    initialSearch.get("tab") === "review" ? "review" : "mine",
  );
  const [clubFilter, setClubFilter] = useState<string>(initialSearch.get("club") ?? "");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    initialSearch.get("plan") ?? null,
  );
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Create / Edit modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [communityId, setCommunityId] = useState<string>("");
  const [departureDate, setDepartureDate] = useState("");
  const [meetingPin, setMeetingPin] = useState<MapPoint | null>(null);
  const [destinationPin, setDestinationPin] = useState<MapPoint | null>(null);
  const [waypointPins, setWaypointPins] = useState<MapPoint[]>([]);
  const [notes, setNotes] = useState("");
  const [editorSections, setEditorSections] = useState<TripChecklistSection[]>([]);
  const [editorSectionDraft, setEditorSectionDraft] = useState("");
  const [editorItemDrafts, setEditorItemDrafts] = useState<Record<string, string>>({});
  const [savingEditor, setSavingEditor] = useState(false);

  // Detail modal checklist & collaboration state
  const [localChecklists, setLocalChecklists] = useState<Record<string, TripChecklistSection[]>>(
    {},
  );
  const [dirtyChecklistIds, setDirtyChecklistIds] = useState<Record<string, boolean>>({});
  const [newSectionInputs, setNewSectionInputs] = useState<Record<string, string>>({});
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [savingChecklistId, setSavingChecklistId] = useState<string | null>(null);
  const [collabInput, setCollabInput] = useState("");

  // Review action state
  const [reviewAction, setReviewAction] = useState<"revise" | "reject" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [planList, clubsRes] = await Promise.all([
        fetchTripPlans(clubFilter || undefined),
        authRequest<{ communities?: ClubOption[] } | ClubOption[]>("/communities?limit=50").catch(
          () => [],
        ),
      ]);
      const sorted = [...planList].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      setPlans(sorted);

      const nextChecklists: Record<string, TripChecklistSection[]> = {};
      for (const p of sorted) {
        nextChecklists[p.id] = Array.isArray(p.checklist_sections) ? p.checklist_sections : [];
      }
      setLocalChecklists(nextChecklists);
      setDirtyChecklistIds({});

      const rawClubs = Array.isArray(clubsRes)
        ? clubsRes
        : Array.isArray(clubsRes?.communities)
          ? clubsRes.communities
          : [];
      setClubs(rawClubs.filter((c) => c && c.id && c.name));
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to load trip plans.",
      });
    } finally {
      setLoading(false);
    }
  }, [clubFilter, isAuthenticated]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const selectedClubOption = useMemo(
    () => clubs.find((c) => c.id === communityId) ?? null,
    [clubs, communityId],
  );

  const canDirectPublish = useMemo(() => {
    if (isGlobalModOrAdmin) return true;
    if (!selectedClubOption) return false;
    if (selectedClubOption.can_create_event) return true;
    const role = (selectedClubOption.my_role ?? "").toLowerCase();
    return ["founder", "owner", "administrator", "admin", "moderator"].includes(role);
  }, [isGlobalModOrAdmin, selectedClubOption]);

  const queuePlans = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.can_review &&
          (p.status === "pending_review" ||
            p.status === "needs_revision" ||
            p.status === "rejected"),
      ),
    [plans],
  );

  const myAndPublishedPlans = useMemo(
    () => (activeTab === "review" ? queuePlans : plans),
    [activeTab, plans, queuePlans],
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const openCreateModal = () => {
    setEditingPlanId(null);
    setTitle("");
    setDescription("");
    setCommunityId(clubFilter || "");
    setDepartureDate("");
    setMeetingPin(null);
    setDestinationPin(null);
    setWaypointPins([]);
    setNotes("");
    setEditorSections([]);
    setEditorSectionDraft("");
    setEditorItemDrafts({});
    setEditorOpen(true);
  };

  const openEditModal = (plan: TripPlanItem) => {
    const pts = planMapPoints(plan);
    setEditingPlanId(plan.id);
    setTitle(plan.title);
    setDescription(plan.description ?? "");
    setCommunityId(plan.community_id ?? "");
    setDepartureDate(plan.departure_date ? plan.departure_date.slice(0, 16) : "");
    setMeetingPin(pts.meeting);
    setDestinationPin(pts.destination);
    setWaypointPins(pts.waypoints);
    setNotes(plan.notes ?? "");
    setEditorSections(plan.checklist_sections ?? []);
    setEditorSectionDraft("");
    setEditorItemDrafts({});
    setEditorOpen(true);
  };

  const moveWaypoint = (index: number, delta: -1 | 1) => {
    setWaypointPins((prev) => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      if (item) copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleSavePlan = async (publishOrSubmit: boolean) => {
    if (!title.trim()) {
      setNotice({ kind: "err", text: "Trip plan title is required." });
      return;
    }
    if (publishOrSubmit && !communityId && !canDirectPublish) {
      setNotice({
        kind: "err",
        text: "Select a club before submitting for moderator review.",
      });
      return;
    }

    setSavingEditor(true);
    setNotice(null);
    try {
      const isoDate = departureDate ? new Date(departureDate).toISOString() : null;
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        departure_date: isoDate,
        meeting_point: meetingPin?.name || undefined,
        meeting_lat: meetingPin?.lat ?? null,
        meeting_lng: meetingPin?.lng ?? null,
        destination_name: destinationPin?.name || undefined,
        destination_lat: destinationPin?.lat ?? null,
        destination_lng: destinationPin?.lng ?? null,
        waypoints: waypointPins.map((w) => ({ name: w.name, lat: w.lat, lng: w.lng })),
        notes: notes.trim() || undefined,
      };

      if (editingPlanId) {
        await updateTripPlan(editingPlanId, payload);
        if (editorSections.length > 0) {
          await saveTripPlanChecklist(editingPlanId, editorSections);
        }
        if (publishOrSubmit && communityId) {
          await submitTripPlanForReview(editingPlanId);
        }
        setNotice({
          kind: "ok",
          text: publishOrSubmit
            ? canDirectPublish
              ? "Trip plan published and synced to mobile."
              : "Trip plan submitted for moderator review."
            : "Trip plan draft updated.",
        });
      } else {
        const res = await createTripPlan({
          ...payload,
          community_id: communityId || null,
          submit_for_review: publishOrSubmit,
          checklist_sections: editorSections.length > 0 ? editorSections : undefined,
        });
        setNotice({
          kind: "ok",
          text:
            res.status === "approved"
              ? "Trip plan published immediately and visible on mobile."
              : res.status === "pending_review"
                ? "Trip plan submitted for club moderator approval."
                : "Trip plan saved as draft.",
        });
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to save trip plan.",
      });
    } finally {
      setSavingEditor(false);
    }
  };

  const handleDeletePlan = async (plan: TripPlanItem) => {
    try {
      await deleteTripPlan(plan.id);
      setSelectedPlanId(null);
      setNotice({ kind: "ok", text: `Deleted "${plan.title}".` });
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to delete trip plan.",
      });
    }
  };

  const handleSubmitDraft = async (plan: TripPlanItem) => {
    try {
      const res = await submitTripPlanForReview(plan.id);
      setNotice({
        kind: "ok",
        text:
          res.status === "approved"
            ? `"${plan.title}" published immediately.`
            : `"${plan.title}" sent to club moderators for review.`,
      });
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to submit trip plan.",
      });
    }
  };

  const handleReviewDecision = async (
    plan: TripPlanItem,
    action: "approve" | "revise" | "reject",
    reason?: string,
  ) => {
    if (action === "revise" && !reason?.trim()) {
      setNotice({ kind: "err", text: "Please provide a revision reason for the rider." });
      return;
    }
    setReviewBusy(true);
    try {
      await reviewTripPlan(plan.id, action, reason?.trim() || undefined);
      setReviewAction(null);
      setReviewReason("");
      setNotice({
        kind: "ok",
        text:
          action === "approve"
            ? `"${plan.title}" approved & published.`
            : action === "revise"
              ? `Revision request sent for "${plan.title}".`
              : `"${plan.title}" rejected.`,
      });
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Review action failed.",
      });
    } finally {
      setReviewBusy(false);
    }
  };

  const updateLocalPlanSections = (
    planId: string,
    updater: (prev: TripChecklistSection[]) => TripChecklistSection[],
  ) => {
    setLocalChecklists((prev) => ({
      ...prev,
      [planId]: updater(prev[planId] ?? []),
    }));
    setDirtyChecklistIds((prev) => ({ ...prev, [planId]: true }));
  };

  const handleSaveChecklist = async (planId: string) => {
    setSavingChecklistId(planId);
    try {
      const sections = localChecklists[planId] ?? [];
      await saveTripPlanChecklist(planId, sections);
      setDirtyChecklistIds((prev) => ({ ...prev, [planId]: false }));
      setNotice({ kind: "ok", text: "Checklist synced to cloud & mobile." });
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to save checklist.",
      });
    } finally {
      setSavingChecklistId(null);
    }
  };

  const handleInviteCollaborator = async (planId: string) => {
    const clean = collabInput.trim().replace(/^@/, "");
    if (!clean) return;
    try {
      await addTripPlanCollaborator(planId, clean);
      setCollabInput("");
      setNotice({ kind: "ok", text: `Invited @${clean} as collaborator.` });
      await loadAll();
    } catch (err) {
      setNotice({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to invite collaborator.",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Collaborative Trip Planner</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Sign in to create trip drafts, pin road routes, build sectioned checklists, and review
          club ride submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Trip Planner &amp; Club Queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan road routes, build sectioned checklists (up to 5 × 10), and sync directly with REVV
            Mobile.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New Trip Plan
        </button>
      </div>

      {notice && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
            notice.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Tabs & Club Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              activeTab === "mine"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            All Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
              activeTab === "review"
                ? "bg-amber-500 text-slate-950"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardCheck className="size-4" />
            Moderator Review Queue ({queuePlans.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium"
          >
            <option value="">All Clubs</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : myAndPublishedPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <RouteIcon className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-3 text-base font-semibold">
            {activeTab === "review"
              ? "No trip plans awaiting moderator review"
              : "No trip plans yet"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "review"
              ? "Submitted, revised, and rejected club ride drafts will appear here ordered by newest submission."
              : "Create your first trip draft with road route pins and a sectioned checklist."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {myAndPublishedPlans.map((plan) => {
            const pts = planMapPoints(plan);
            const hasPins = Boolean(pts.meeting || pts.destination || pts.waypoints.length > 0);
            const meta = STATUS_META[plan.status] ?? STATUS_META.draft;
            const progress = countChecklistProgress(plan.checklist_sections ?? []);

            return (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPlanId(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPlanId(plan.id);
                  }
                }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                {hasPins && (
                  <TripMapPicker
                    meeting={pts.meeting}
                    destination={pts.destination}
                    waypoints={pts.waypoints}
                    readOnly
                    height={175}
                  />
                )}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-lg font-bold text-foreground group-hover:text-primary">
                        {plan.title}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                        By <span className="text-foreground">@{plan.creator_username}</span> •{" "}
                        {formatSubmittedDate(plan.updated_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        meta.cls,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {plan.community_name && (
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-foreground">
                      <Users className="size-3.5 text-primary" />
                      {plan.community_name}
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full bg-emerald-500" />
                      <span className="truncate">{plan.meeting_point || "Meeting point TBC"}</span>
                    </div>
                    {pts.waypoints.length > 0 && (
                      <div className="flex items-center gap-2 pl-0.5 text-xs text-amber-600 dark:text-amber-400">
                        <MapPin className="size-3.5 shrink-0" />
                        <span>{pts.waypoints.length} intermediate stop(s)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full bg-primary" />
                      <span className="truncate">{plan.destination_name || "Destination TBC"}</span>
                    </div>
                  </div>

                  {plan.review_note && (
                    <div className="rounded-xl border border-orange-500/35 bg-orange-500/10 px-3 py-2 text-xs text-orange-800 dark:text-orange-200">
                      <strong>Moderator note:</strong> {plan.review_note}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <ClipboardCheck className="size-3.5 text-primary" />
                      {progress.done}/{progress.total} checklist •{" "}
                      {(plan.checklist_sections ?? []).length}/{MAX_SECTIONS} sections
                    </span>
                    <span className="font-semibold text-primary">Open Details →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL & MODERATOR REVIEW MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{selectedPlan.title}</h2>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      (STATUS_META[selectedPlan.status] ?? STATUS_META.draft).cls,
                    )}
                  >
                    {(STATUS_META[selectedPlan.status] ?? STATUS_META.draft).label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted by{" "}
                  <span className="font-semibold">@{selectedPlan.creator_username}</span> •{" "}
                  {formatSubmittedDate(selectedPlan.updated_at)}
                  {selectedPlan.community_name ? ` • ${selectedPlan.community_name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanId(null);
                  setReviewAction(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close detail"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Road Route Map Preview */}
              {(() => {
                const pts = planMapPoints(selectedPlan);
                if (!pts.meeting && !pts.destination && pts.waypoints.length === 0) return null;
                return (
                  <TripMapPicker
                    meeting={pts.meeting}
                    destination={pts.destination}
                    waypoints={pts.waypoints}
                    readOnly
                    height={240}
                  />
                );
              })()}

              {/* Route Stops Vertical Row */}
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Route Itinerary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      S
                    </span>
                    <span className="font-medium">
                      {selectedPlan.meeting_point || "Meeting point TBC"}
                    </span>
                  </div>
                  {normalizeWaypoints(selectedPlan.waypoints).map((wp, idx) => (
                    <div key={`${wp.lat}-${wp.lng}-${idx}`} className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                        {idx + 1}
                      </span>
                      <span>{wp.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      D
                    </span>
                    <span className="font-medium">
                      {selectedPlan.destination_name || "Destination TBC"}
                    </span>
                  </div>
                </div>
                {selectedPlan.departure_date && (
                  <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Departure: {formatSubmittedDate(selectedPlan.departure_date)}
                  </p>
                )}
                {selectedPlan.notes && (
                  <p className="pt-1 text-sm text-foreground/90">{selectedPlan.notes}</p>
                )}
              </div>

              {selectedPlan.review_note && (
                <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-orange-800 dark:text-orange-200">
                  <strong>Moderator Feedback:</strong> {selectedPlan.review_note}
                </div>
              )}

              {/* Moderator Review Controls */}
              {selectedPlan.can_review && selectedPlan.status === "pending_review" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-200">
                      Moderator Decision
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => void handleReviewDecision(selectedPlan, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="size-4" />
                        Approve &amp; Publish
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => setReviewAction("revise")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                      >
                        <Clock className="size-4" />
                        Request Revision
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => setReviewAction("reject")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        <XCircle className="size-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                  {reviewAction && (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={3}
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder={
                          reviewAction === "revise"
                            ? "Explain what needs to be revised (required)..."
                            : "Optional rejection reason..."
                        }
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewAction(null);
                            setReviewReason("");
                          }}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={reviewBusy}
                          onClick={() =>
                            void handleReviewDecision(selectedPlan, reviewAction, reviewReason)
                          }
                          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                          Send {reviewAction === "revise" ? "Revision Request" : "Rejection"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sectioned Checklist (Max 5 x 10) */}
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold">
                      Sectioned Pre-Ride Checklist (
                      {(localChecklists[selectedPlan.id] ?? []).length}/{MAX_SECTIONS} sections)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Changes stay local until you click Save Checklist — synced to Mobile swipe
                      view.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingChecklistId === selectedPlan.id}
                    onClick={() => void handleSaveChecklist(selectedPlan.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition",
                      dirtyChecklistIds[selectedPlan.id]
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80",
                    )}
                  >
                    <Save className="size-3.5" />
                    {savingChecklistId === selectedPlan.id
                      ? "Saving..."
                      : dirtyChecklistIds[selectedPlan.id]
                        ? "Save Checklist *"
                        : "Save Checklist"}
                  </button>
                </div>

                {/* Add Section */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSectionInputs[selectedPlan.id] ?? ""}
                    onChange={(e) =>
                      setNewSectionInputs((prev) => ({
                        ...prev,
                        [selectedPlan.id]: e.target.value,
                      }))
                    }
                    disabled={(localChecklists[selectedPlan.id] ?? []).length >= MAX_SECTIONS}
                    placeholder="New section name (e.g. Medical, Tools)..."
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={(localChecklists[selectedPlan.id] ?? []).length >= MAX_SECTIONS}
                    onClick={() => {
                      const label = (newSectionInputs[selectedPlan.id] ?? "").trim();
                      if (!label) return;
                      updateLocalPlanSections(selectedPlan.id, (prev) => [
                        ...prev,
                        { id: makeLocalId("sec"), title: label, items: [] },
                      ]);
                      setNewSectionInputs((prev) => ({ ...prev, [selectedPlan.id]: "" }));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3.5 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
                  >
                    <FolderPlus className="size-4" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-3">
                  {(localChecklists[selectedPlan.id] ?? []).map((sec) => {
                    const itemDraftKey = `${selectedPlan.id}:${sec.id}`;
                    return (
                      <div
                        key={sec.id}
                        className="rounded-xl border border-border bg-card p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">{sec.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {sec.items.length}/{MAX_ITEMS_PER_SECTION}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateLocalPlanSections(selectedPlan.id, (prev) =>
                                  prev.filter((s) => s.id !== sec.id),
                                )
                              }
                              className="rounded p-1 text-muted-foreground hover:text-rose-500"
                              aria-label="Remove section"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {sec.items.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
                                item.checked
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-muted-foreground line-through"
                                  : "border-border bg-background/60 text-foreground",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateLocalPlanSections(selectedPlan.id, (prev) =>
                                    prev.map((s) =>
                                      s.id !== sec.id
                                        ? s
                                        : {
                                            ...s,
                                            items: s.items.map((it) =>
                                              it.id === item.id
                                                ? { ...it, checked: !it.checked }
                                                : it,
                                            ),
                                          },
                                    ),
                                  )
                                }
                                className="flex flex-1 items-center gap-2.5 text-left"
                              >
                                <span
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                                    item.checked
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-border",
                                  )}
                                >
                                  {item.checked && <Check className="size-3.5" />}
                                </span>
                                <span>{item.label}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateLocalPlanSections(selectedPlan.id, (prev) =>
                                    prev.map((s) =>
                                      s.id !== sec.id
                                        ? s
                                        : {
                                            ...s,
                                            items: s.items.filter((it) => it.id !== item.id),
                                          },
                                    ),
                                  )
                                }
                                className="text-muted-foreground hover:text-rose-500"
                                aria-label="Delete item"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={newItemInputs[itemDraftKey] ?? ""}
                            onChange={(e) =>
                              setNewItemInputs((prev) => ({
                                ...prev,
                                [itemDraftKey]: e.target.value,
                              }))
                            }
                            disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                            placeholder="Add item (e.g. obat batuk, tabung oksigen)..."
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                          />
                          <button
                            type="button"
                            disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                            onClick={() => {
                              const label = (newItemInputs[itemDraftKey] ?? "").trim();
                              if (!label) return;
                              updateLocalPlanSections(selectedPlan.id, (prev) =>
                                prev.map((s) =>
                                  s.id !== sec.id
                                    ? s
                                    : {
                                        ...s,
                                        items: [
                                          ...s.items,
                                          { id: makeLocalId("item"), label, checked: false },
                                        ],
                                      },
                                ),
                              );
                              setNewItemInputs((prev) => ({ ...prev, [itemDraftKey]: "" }));
                            }}
                            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Collaborators */}
              {selectedPlan.can_edit && (
                <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                  <h3 className="text-sm font-bold">
                    Collaborators ({selectedPlan.collaborators.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.collaborators.map((c) => (
                      <span
                        key={c.user_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold"
                      >
                        @{c.username}
                        <button
                          type="button"
                          onClick={() =>
                            void removeTripPlanCollaborator(selectedPlan.id, c.user_id).then(
                              loadAll,
                            )
                          }
                          className="text-muted-foreground hover:text-rose-500"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={collabInput}
                      onChange={(e) => setCollabInput(e.target.value)}
                      placeholder="Invite @username to co-edit..."
                      className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleInviteCollaborator(selectedPlan.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold hover:bg-secondary/80"
                    >
                      <UserPlus className="size-4" />
                      Invite
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedPlan.can_edit && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => void handleDeletePlan(selectedPlan)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedPlan;
                      setSelectedPlanId(null);
                      openEditModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
                  >
                    <Edit3 className="size-4" />
                    Edit Plan
                  </button>
                  {(selectedPlan.status === "draft" || selectedPlan.status === "needs_revision") &&
                    selectedPlan.community_id && (
                      <button
                        type="button"
                        onClick={() => void handleSubmitDraft(selectedPlan)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Send className="size-4" />
                        {selectedPlan.can_review ? "Publish Now" : "Submit for Review"}
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT TRIP PLAN MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-xl font-bold">
                {editingPlanId ? "Edit Trip Plan" : "Create Trip Plan"}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Trip Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sunday Morning Run to Puncak"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Club (Optional)</label>
                  <select
                    value={communityId}
                    onChange={(e) => setCommunityId(e.target.value)}
                    disabled={Boolean(editingPlanId)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                  >
                    <option value="">Personal Draft (No Club)</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Departure Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Short Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Pace, bike class, briefing notes..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Interactive Road Map Picker */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Route Map Picker (Road Navigation Preview)
                </label>
                <TripMapPicker
                  meeting={meetingPin}
                  destination={destinationPin}
                  waypoints={waypointPins}
                  onPickMeeting={setMeetingPin}
                  onPickDestination={setDestinationPin}
                  onAddWaypoint={(pt) => setWaypointPins((prev) => [...prev, pt].slice(0, 20))}
                />
              </div>

              {/* Mobile-style Vertical Multi-Stop Rows */}
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Route Stops (Mobile Row View)</span>
                  <span className="text-xs text-muted-foreground">
                    {waypointPins.length} intermediate stop(s)
                  </span>
                </div>

                {/* Start Row */}
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/35 bg-card px-3.5 py-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    A
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Start / Meeting Point
                    </div>
                    <div className="truncate text-sm font-medium">
                      {meetingPin ? meetingPin.name : "Click map above to set Start Point"}
                    </div>
                  </div>
                  {meetingPin && (
                    <button
                      type="button"
                      onClick={() => setMeetingPin(null)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Stop Rows */}
                {waypointPins.map((wp, idx) => (
                  <div
                    key={`${wp.lat}-${wp.lng}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/35 bg-card px-3.5 py-2.5"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Stop {idx + 1}
                      </div>
                      <div className="truncate text-sm font-medium">{wp.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveWaypoint(idx, -1)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        aria-label="Move stop up"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === waypointPins.length - 1}
                        onClick={() => moveWaypoint(idx, 1)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        aria-label="Move stop down"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWaypointPins((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-1 text-muted-foreground hover:text-rose-500"
                        aria-label="Remove stop"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Destination Row */}
                <div className="flex items-center gap-3 rounded-xl border border-primary/35 bg-card px-3.5 py-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    B
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-primary">Destination</div>
                    <div className="truncate text-sm font-medium">
                      {destinationPin ? destinationPin.name : "Click map above to set Destination"}
                    </div>
                  </div>
                  {destinationPin && (
                    <button
                      type="button"
                      onClick={() => setDestinationPin(null)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sectioned Checklist Builder */}
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    Checklist Template ({editorSections.length}/{MAX_SECTIONS} sections)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Max {MAX_ITEMS_PER_SECTION} items per section
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editorSectionDraft}
                    onChange={(e) => setEditorSectionDraft(e.target.value)}
                    disabled={editorSections.length >= MAX_SECTIONS}
                    placeholder="Add section (e.g. Medical, Gear)..."
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={editorSections.length >= MAX_SECTIONS}
                    onClick={() => {
                      const clean = editorSectionDraft.trim();
                      if (!clean) return;
                      setEditorSections((prev) => [
                        ...prev,
                        { id: makeLocalId("sec"), title: clean, items: [] },
                      ]);
                      setEditorSectionDraft("");
                    }}
                    className="rounded-xl bg-secondary px-3.5 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
                  >
                    + Section
                  </button>
                </div>

                {editorSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{sec.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditorSections((prev) => prev.filter((s) => s.id !== sec.id))
                        }
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium"
                        >
                          {item.label}
                          <button
                            type="button"
                            onClick={() =>
                              setEditorSections((prev) =>
                                prev.map((s) =>
                                  s.id !== sec.id
                                    ? s
                                    : { ...s, items: s.items.filter((it) => it.id !== item.id) },
                                ),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editorItemDrafts[sec.id] ?? ""}
                        onChange={(e) =>
                          setEditorItemDrafts((prev) => ({ ...prev, [sec.id]: e.target.value }))
                        }
                        disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                        placeholder="Add checkbox item..."
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                        onClick={() => {
                          const label = (editorItemDrafts[sec.id] ?? "").trim();
                          if (!label) return;
                          setEditorSections((prev) =>
                            prev.map((s) =>
                              s.id !== sec.id
                                ? s
                                : {
                                    ...s,
                                    items: [
                                      ...s.items,
                                      { id: makeLocalId("item"), label, checked: false },
                                    ],
                                  },
                            ),
                          );
                          setEditorItemDrafts((prev) => ({ ...prev, [sec.id]: "" }));
                        }}
                        className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">Ride Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Fuel stops, emergency contact, gear requirements..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border px-6 py-4">
              <button
                type="button"
                disabled={savingEditor}
                onClick={() => void handleSavePlan(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                <Save className="size-4" />
                Save Draft
              </button>
              <button
                type="button"
                disabled={savingEditor || (!communityId && !canDirectPublish)}
                onClick={() => void handleSavePlan(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {canDirectPublish ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Publish Now
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
