import { authRequest } from "@/lib/api";

export interface TripPlanCollaborator {
  user_id: string;
  username: string;
  avatar_url?: string | null;
}

export interface TripChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface TripChecklistSection {
  id: string;
  title: string;
  items: TripChecklistItem[];
}

export interface TripWaypointStop {
  name: string;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}

export type TripPlanStatus =
  | "draft"
  | "pending_review"
  | "needs_revision"
  | "approved"
  | "rejected";

export interface TripPlanItem {
  id: string;
  community_id?: string | null;
  community_name?: string | null;
  creator_id: string;
  creator_username: string;
  title: string;
  description?: string | null;
  departure_date?: string | null;
  meeting_point?: string | null;
  meeting_lat?: number | null;
  meeting_lng?: number | null;
  destination_name?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  waypoints: Array<TripWaypointStop | string>;
  notes?: string | null;
  status: TripPlanStatus;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  can_review: boolean;
  collaborators: TripPlanCollaborator[];
  checklist_sections: TripChecklistSection[];
}

export async function fetchTripPlans(communityId?: string): Promise<TripPlanItem[]> {
  const qs = communityId ? `?community_id=${encodeURIComponent(communityId)}` : "";
  return authRequest<TripPlanItem[]>(`/trip-plans${qs}`);
}

export interface RoadRouteCoordinate {
  lat: number;
  lng: number;
}

const roadRouteCache = new Map<string, RoadRouteCoordinate[]>();

export async function fetchRoadRouteGeometry(
  points: RoadRouteCoordinate[],
): Promise<RoadRouteCoordinate[]> {
  if (points.length < 2) return points;
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(";");
  const cached = roadRouteCache.get(key);
  if (cached) return cached;

  const origin = points[0]!;
  const dest = points[points.length - 1]!;
  const waypoints = points.slice(1, -1).map((p) => ({ lat: p.lat, lon: p.lng }));

  try {
    const raw = await authRequest<{
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
    }>("/geo/route", {
      method: "POST",
      body: JSON.stringify({
        origin_lat: origin.lat,
        origin_lon: origin.lng,
        dest_lat: dest.lat,
        dest_lon: dest.lng,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      }),
    });
    const coords = raw?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const parsed = coords
        .filter((pair) => Array.isArray(pair) && pair.length >= 2)
        .map(([lon, lat]) => ({ lat: Number(lat), lng: Number(lon) }))
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));
      if (parsed.length >= 2) {
        roadRouteCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // Fallback to direct pin sequence if routing upstream is unreachable.
  }
  return points;
}

export async function createTripPlan(payload: {
  community_id?: string | null | undefined;
  title: string;
  description?: string | undefined;
  departure_date?: string | null | undefined;
  meeting_point?: string | undefined;
  meeting_lat?: number | null | undefined;
  meeting_lng?: number | null | undefined;
  destination_name?: string | undefined;
  destination_lat?: number | null | undefined;
  destination_lng?: number | null | undefined;
  waypoints?: TripWaypointStop[] | undefined;
  notes?: string | undefined;
  submit_for_review?: boolean | undefined;
  checklist_sections?: TripChecklistSection[] | undefined;
}): Promise<{ id: string; status: TripPlanStatus }> {
  return authRequest<{ id: string; status: TripPlanStatus }>("/trip-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTripPlan(
  planId: string,
  payload: {
    title?: string | undefined;
    description?: string | undefined;
    departure_date?: string | null | undefined;
    meeting_point?: string | undefined;
    meeting_lat?: number | null | undefined;
    meeting_lng?: number | null | undefined;
    destination_name?: string | undefined;
    destination_lat?: number | null | undefined;
    destination_lng?: number | null | undefined;
    waypoints?: TripWaypointStop[] | undefined;
    notes?: string | undefined;
  },
): Promise<{ id: string }> {
  return authRequest<{ id: string }>(`/trip-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTripPlan(planId: string): Promise<{ deleted: boolean }> {
  return authRequest<{ deleted: boolean }>(`/trip-plans/${planId}`, {
    method: "DELETE",
  });
}

export async function addTripPlanCollaborator(
  planId: string,
  username: string,
): Promise<TripPlanCollaborator[]> {
  return authRequest<TripPlanCollaborator[]>(`/trip-plans/${planId}/collaborators`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function removeTripPlanCollaborator(
  planId: string,
  userId: string,
): Promise<{ removed: boolean }> {
  return authRequest<{ removed: boolean }>(`/trip-plans/${planId}/collaborators/${userId}`, {
    method: "DELETE",
  });
}

export async function submitTripPlanForReview(
  planId: string,
): Promise<{ id: string; status: TripPlanStatus }> {
  return authRequest<{ id: string; status: TripPlanStatus }>(`/trip-plans/${planId}/submit`, {
    method: "POST",
  });
}

export async function reviewTripPlan(
  planId: string,
  action: "approve" | "reject" | "revise",
  reason?: string,
): Promise<{ id: string; status: TripPlanStatus; review_note?: string | null }> {
  return authRequest<{ id: string; status: TripPlanStatus; review_note?: string | null }>(
    `/trip-plans/${planId}/review`,
    {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    },
  );
}

export async function saveTripPlanChecklist(
  planId: string,
  sections: TripChecklistSection[],
): Promise<{ trip_plan_id: string; sections: TripChecklistSection[] }> {
  return authRequest<{ trip_plan_id: string; sections: TripChecklistSection[] }>(
    `/trip-plans/${planId}/checklist`,
    {
      method: "PUT",
      body: JSON.stringify({ sections }),
    },
  );
}
