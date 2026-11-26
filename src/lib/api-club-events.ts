import { authRequest } from "@/lib/api";
import type { TripChecklistSection } from "@/lib/api-trip-plans";

export type ClubEventApprovalStatus =
  | "draft"
  | "pending_review"
  | "needs_revision"
  | "approved"
  | "rejected";

export interface ClubEventStopInput {
  order: number;
  name: string;
  label?: string | undefined;
  address?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

export interface QueuedClubEventItem {
  id: string;
  community_id: string;
  community_name: string;
  created_by: string;
  creator_username: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes: number;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  route_polyline?: string | null;
  stops: Array<{
    name?: string;
    label?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  status: string;
  approval_status: ClubEventApprovalStatus;
  review_note?: string | null;
  submitted_at?: string | null;
  created_at: string;
  can_edit: boolean;
  can_review: boolean;
  collaborators: Array<{ user_id: string; username: string; avatar_url?: string | null }>;
  checklist_sections: TripChecklistSection[];
}

export async function fetchClubEventQueue(communityId: string): Promise<QueuedClubEventItem[]> {
  return authRequest<QueuedClubEventItem[]>(`/communities/${communityId}/events/queue`);
}

export async function fetchGlobalEventReviewQueue(): Promise<QueuedClubEventItem[]> {
  return authRequest<QueuedClubEventItem[]>("/events/review-queue");
}

export async function createClubEventWithPlanner(
  communityId: string,
  payload: {
    title: string;
    description?: string | undefined;
    start_time: string;
    duration_minutes?: number | undefined;
    location_name?: string | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    stops?: ClubEventStopInput[] | undefined;
    route_polyline?: string | undefined;
    checklist_sections?: TripChecklistSection[] | undefined;
    save_as_draft?: boolean | undefined;
    submit_for_review?: boolean | undefined;
  },
): Promise<{ id: string; approval_status?: ClubEventApprovalStatus }> {
  return authRequest<{ id: string; approval_status?: ClubEventApprovalStatus }>(
    `/communities/${communityId}/events`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitClubEventForReview(
  eventId: string,
): Promise<{ id: string; approval_status: ClubEventApprovalStatus }> {
  return authRequest<{ id: string; approval_status: ClubEventApprovalStatus }>(
    `/events/${eventId}/submit`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function reviewClubEvent(
  eventId: string,
  action: "approve" | "revise" | "reject",
  reason?: string,
): Promise<{ id: string; approval_status: ClubEventApprovalStatus; review_note?: string | null }> {
  return authRequest<{
    id: string;
    approval_status: ClubEventApprovalStatus;
    review_note?: string | null;
  }>(`/events/${eventId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

export async function saveClubEventChecklist(
  eventId: string,
  sections: TripChecklistSection[],
): Promise<{ event_id: string; sections: TripChecklistSection[] }> {
  return authRequest<{ event_id: string; sections: TripChecklistSection[] }>(
    `/events/${eventId}/checklist`,
    {
      method: "PUT",
      body: JSON.stringify({ sections }),
    },
  );
}
