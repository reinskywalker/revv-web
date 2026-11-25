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

export async function fetchTripPlans(): Promise<TripPlanItem[]> {
  return authRequest<TripPlanItem[]>("/trip-plans");
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
