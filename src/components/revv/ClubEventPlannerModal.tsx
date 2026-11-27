import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Save, Send, Trash2, X } from "lucide-react";
import { type ClubEventStopInput, createClubEventWithPlanner } from "@/lib/api-club-events";
import {
  encodeGooglePolyline5,
  fetchRoadRouteGeometry,
  type TripChecklistSection,
} from "@/lib/api-trip-plans";
import { type MapPoint, TripMapPicker } from "@/components/revv/TripMapPicker";

const MAX_SECTIONS = 5;
const MAX_ITEMS_PER_SECTION = 10;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

interface ClubEventPlannerModalProps {
  communityId: string;
  communityName: string;
  canPublishDirectly: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
}

export function ClubEventPlannerModal({
  communityId,
  communityName,
  canPublishDirectly,
  onClose,
  onCreated,
}: ClubEventPlannerModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const dt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    dt.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  });
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [meetingPin, setMeetingPin] = useState<MapPoint | null>(null);
  const [destinationPin, setDestinationPin] = useState<MapPoint | null>(null);
  const [waypoints, setWaypoints] = useState<MapPoint[]>([]);
  const [sections, setSections] = useState<TripChecklistSection[]>([]);
  const [sectionDraft, setSectionDraft] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveStop = (idx: number, delta: -1 | 1) => {
    setWaypoints((prev) => {
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      if (moved) copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (title.trim().length < 3) {
      setError("Event title must be at least 3 characters.");
      return;
    }
    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      setError("Please select a valid start date and time.");
      return;
    }

    const stops: ClubEventStopInput[] = [];
    if (meetingPin) {
      stops.push({
        order: stops.length + 1,
        label: "Start / Meeting Point",
        name: meetingPin.name,
        latitude: meetingPin.lat,
        longitude: meetingPin.lng,
      });
    }
    waypoints.forEach((wp, i) => {
      stops.push({
        order: stops.length + 1,
        label: `Stop ${i + 1}`,
        name: wp.name,
        latitude: wp.lat,
        longitude: wp.lng,
      });
    });
    if (destinationPin) {
      stops.push({
        order: stops.length + 1,
        label: "Destination",
        name: destinationPin.name,
        latitude: destinationPin.lat,
        longitude: destinationPin.lng,
      });
    }

    setSaving(true);
    setError(null);
    try {
      const pinCoords = stops
        .filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number")
        .map((s) => ({ lat: s.latitude!, lng: s.longitude! }));
      let routePolyline: string | undefined;
      if (pinCoords.length >= 2) {
        const roadPts = await fetchRoadRouteGeometry(pinCoords);
        if (roadPts.length >= 2) {
          routePolyline = encodeGooglePolyline5(roadPts);
        }
      }

      const res = await createClubEventWithPlanner(communityId, {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: parsedStart.toISOString(),
        duration_minutes: durationMinutes,
        location_name: meetingPin?.name || destinationPin?.name || undefined,
        latitude: meetingPin?.lat ?? destinationPin?.lat ?? null,
        longitude: meetingPin?.lng ?? destinationPin?.lng ?? null,
        stops: stops.length > 0 ? stops : undefined,
        route_polyline: routePolyline,
        checklist_sections: sections.length > 0 ? sections : undefined,
        save_as_draft: saveAsDraft,
        submit_for_review: !saveAsDraft && !canPublishDirectly,
      });
      const msg = saveAsDraft
        ? "Event draft saved in club queue."
        : res.approval_status === "pending_review"
          ? "Event submitted to club moderators for review."
          : "Event published and synced to Mobile!";
      onCreated(msg);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save club event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">
              {canPublishDirectly ? "Create Club Event" : "Propose Club Event"}
            </h2>
            <p className="text-xs text-muted-foreground">{communityName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Event Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunday Morning Run to Lembang"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Start Date &amp; Time *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">Description / Briefing</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pace, bike class, briefing notes..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Duration (min)</label>
              <input
                type="number"
                min={15}
                max={10080}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 120)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Route Map Picker (Road Navigation Preview)
            </label>
            <TripMapPicker
              meeting={meetingPin}
              destination={destinationPin}
              waypoints={waypoints}
              onPickMeeting={setMeetingPin}
              onPickDestination={setDestinationPin}
              onAddWaypoint={(pt) => setWaypoints((prev) => [...prev, pt].slice(0, 20))}
            />
          </div>

          {/* Mobile-style Vertical Multi-Stop Row List */}
          <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2.5">
            <span className="block text-sm font-bold">Route Stops</span>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/35 bg-card px-3.5 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                A
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {meetingPin ? meetingPin.name : "Click map above to set Start / Meeting Point"}
              </span>
              {meetingPin && (
                <button type="button" onClick={() => setMeetingPin(null)}>
                  <X className="size-4 text-muted-foreground hover:text-rose-500" />
                </button>
              )}
            </div>
            {waypoints.map((wp, idx) => (
              <div
                key={`${wp.lat}-${wp.lng}-${idx}`}
                className="flex items-center gap-3 rounded-xl border border-amber-500/35 bg-card px-3.5 py-2.5"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                  {idx + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{wp.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveStop(idx, -1)}
                    className="rounded p-1 hover:bg-secondary disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === waypoints.length - 1}
                    onClick={() => moveStop(idx, 1)}
                    className="rounded p-1 hover:bg-secondary disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded p-1 hover:text-rose-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl border border-primary/35 bg-card px-3.5 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                B
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {destinationPin ? destinationPin.name : "Click map above to set Destination"}
              </span>
              {destinationPin && (
                <button type="button" onClick={() => setDestinationPin(null)}>
                  <X className="size-4 text-muted-foreground hover:text-rose-500" />
                </button>
              )}
            </div>
          </div>

          {/* Sectioned Checklist Builder (Max 5 x 10) */}
          <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                Pre-Ride Checklist ({sections.length}/{MAX_SECTIONS} sections)
              </span>
              <span className="text-xs text-muted-foreground">
                Synced to Mobile swipe checklist (max {MAX_ITEMS_PER_SECTION}/section)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sectionDraft}
                onChange={(e) => setSectionDraft(e.target.value)}
                disabled={sections.length >= MAX_SECTIONS}
                placeholder="Add section (e.g. Medical, Tools)..."
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={sections.length >= MAX_SECTIONS}
                onClick={() => {
                  const clean = sectionDraft.trim();
                  if (!clean) return;
                  setSections((prev) => [...prev, { id: makeId("sec"), title: clean, items: [] }]);
                  setSectionDraft("");
                }}
                className="rounded-xl bg-secondary px-3.5 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
              >
                + Section
              </button>
            </div>

            {sections.map((sec) => (
              <div key={sec.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{sec.title}</span>
                  <button
                    type="button"
                    onClick={() => setSections((prev) => prev.filter((s) => s.id !== sec.id))}
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
                          setSections((prev) =>
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
                    value={itemDrafts[sec.id] ?? ""}
                    onChange={(e) =>
                      setItemDrafts((prev) => ({ ...prev, [sec.id]: e.target.value }))
                    }
                    disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                    placeholder="Add item (e.g. obat batuk, tabung oksigen)..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={sec.items.length >= MAX_ITEMS_PER_SECTION}
                    onClick={() => {
                      const label = (itemDrafts[sec.id] ?? "").trim();
                      if (!label) return;
                      setSections((prev) =>
                        prev.map((s) =>
                          s.id !== sec.id
                            ? s
                            : {
                                ...s,
                                items: [...s.items, { id: makeId("item"), label, checked: false }],
                              },
                        ),
                      );
                      setItemDrafts((prev) => ({ ...prev, [sec.id]: "" }));
                    }}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border px-6 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            <Save className="size-4" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {canPublishDirectly ? (
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
  );
}
