import { authRequest, authRequestRaw, compressImageFile } from "./api";

export interface SavedRouteItem {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  origin_name?: string | null;
  destination_name?: string | null;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  visibility?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RideTripSummary {
  id: string;
  user_id: string;
  title: string;
  status: string;
  start_time: string;
  end_time?: string | null;
  total_distance_km: number;
  total_duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh?: number | null;
  created_at: string;
}

export interface TripsPagedResult {
  trips: RideTripSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MasterComponentItemPublic {
  id: number;
  code: string;
  name: string;
  default_interval_km?: number | null;
  default_interval_months?: number | null;
  applicable_transmission: string[];
}

export interface GarageComponentItem {
  id: string;
  component_id: number;
  code: string;
  name: string;
  brand_or_spec?: string | null;
  last_replaced_date: string;
  last_replaced_mileage: number;
  interval_km?: number | null;
  interval_months?: number | null;
  next_due_mileage?: number | null;
  next_due_date?: string | null;
  current_mileage: number;
  is_due: boolean;
  is_reminder_enabled: boolean;
}

export interface MaintenanceLogItem {
  id: string;
  garage_id: string;
  component_id?: number | null;
  service_type: string;
  part_name_or_brand?: string | null;
  service_date: string;
  mileage_at_service: number;
  cost: string;
  workshop_name?: string | null;
  notes?: string | null;
}

export interface CommunitySummary {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  visibility: string;
  location_name?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  member_count: number;
  event_count: number;
  thread_count: number;
  channel_count: number;
  my_role?: string | null;
  my_status?: string | null;
  created_at: string;
}

export interface CommunityEventItem {
  id: string;
  community_id: string;
  community_name: string;
  title: string;
  description?: string | null;
  start_time: string;
  duration_minutes: number;
  location_name?: string | null;
  is_riding_event: boolean;
  going_count: number;
  interested_count: number;
  not_going_count: number;
  my_rsvp?: string | null;
}

export interface DirectConversationItem {
  other_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}

export interface DirectMessageItem {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportPurposeItem {
  id: string;
  code: string;
  label: string;
  description: string;
}

export interface UserSupportTicketItem {
  id: string;
  reference_code: string;
  purpose_label: string;
  message: string;
  status: string;
  admin_reply?: string | null;
  created_at: string;
  can_user_reply?: boolean;
  messages?: Array<{
    id: string;
    sender_role: string;
    sender_name?: string | null;
    message: string;
    created_at: string;
  }>;
}

// Saved Routes
export async function fetchMySavedRoutes(): Promise<SavedRouteItem[]> {
  return authRequest<SavedRouteItem[]>("/me/saved-routes");
}

export async function fetchUserSavedRoutes(userId: string): Promise<SavedRouteItem[]> {
  return authRequest<SavedRouteItem[]>(`/users/${encodeURIComponent(userId)}/saved-routes`);
}

export async function updateSavedRouteVisibility(
  routeId: string,
  visibility: "public" | "friends" | "private",
): Promise<void> {
  await authRequest(`/me/saved-routes/${encodeURIComponent(routeId)}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export async function deleteMySavedRoute(routeId: string): Promise<void> {
  await authRequest(`/me/saved-routes/${encodeURIComponent(routeId)}`, {
    method: "DELETE",
  });
}

// Trips History
export async function fetchMyTrips(params?: {
  page?: number;
  limit?: number;
  q?: string;
  sort_by?: "date" | "name";
  sort_dir?: "asc" | "desc";
}): Promise<TripsPagedResult> {
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 15),
  });
  if (params?.q?.trim()) qs.set("q", params.q.trim());
  if (params?.sort_by) qs.set("sort_by", params.sort_by);
  if (params?.sort_dir) qs.set("sort_dir", params.sort_dir);

  const raw = await authRequestRaw<RideTripSummary[]>(`/trips?${qs.toString()}`);
  const meta =
    (raw.results as {
      page?: number;
      limit?: number;
      total?: number;
      total_pages?: number;
      has_more?: boolean;
    }) ?? {};
  const trips = Array.isArray(raw.data) ? raw.data : [];
  return {
    trips,
    page: meta.page ?? params?.page ?? 1,
    limit: meta.limit ?? params?.limit ?? 15,
    total: meta.total ?? trips.length,
    totalPages: meta.total_pages ?? 1,
    hasMore: Boolean(meta.has_more),
  };
}

export async function deleteMyTrip(tripId: string): Promise<void> {
  await authRequest(`/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
}

// Garage Extensions (Wear Components, Maintenance Logs & Image Upload)
export async function fetchMasterComponentsPublic(): Promise<MasterComponentItemPublic[]> {
  return authRequest<MasterComponentItemPublic[]>("/master/components");
}

export async function fetchGarageComponents(garageId: string): Promise<GarageComponentItem[]> {
  return authRequest<GarageComponentItem[]>(
    `/me/garage/${encodeURIComponent(garageId)}/components`,
  );
}

export async function upsertGarageComponent(
  garageId: string,
  payload: {
    component_id: number;
    brand_or_spec?: string;
    last_replaced_date?: string;
    last_replaced_mileage?: number;
    custom_interval_km?: number;
    custom_interval_months?: number;
    is_reminder_enabled?: boolean;
  },
): Promise<GarageComponentItem> {
  return authRequest<GarageComponentItem>(`/me/garage/${encodeURIComponent(garageId)}/components`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteGarageComponent(garageId: string, entryId: string): Promise<void> {
  await authRequest(
    `/me/garage/${encodeURIComponent(garageId)}/components/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
  );
}

export async function fetchMaintenanceLogs(garageId: string): Promise<MaintenanceLogItem[]> {
  return authRequest<MaintenanceLogItem[]>(
    `/me/garage/${encodeURIComponent(garageId)}/maintenance`,
  );
}

export async function createMaintenanceLog(
  garageId: string,
  payload: {
    component_id?: number | null;
    service_type: string;
    part_name_or_brand?: string;
    service_date?: string;
    mileage_at_service?: number;
    cost?: string | number;
    workshop_name?: string;
    notes?: string;
  },
): Promise<MaintenanceLogItem> {
  return authRequest<MaintenanceLogItem>(`/me/garage/${encodeURIComponent(garageId)}/maintenance`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaintenanceLog(garageId: string, logId: string): Promise<void> {
  await authRequest(
    `/me/garage/${encodeURIComponent(garageId)}/maintenance/${encodeURIComponent(logId)}`,
    { method: "DELETE" },
  );
}

export async function uploadGarageBikeImage(
  garageId: string,
  file: File,
): Promise<{ image_path?: string; url?: string }> {
  const compressed = await compressImageFile(file, 1600, 0.82);
  const form = new FormData();
  form.append("image", compressed);
  return authRequest<{ image_path?: string; url?: string }>(
    `/me/garage/${encodeURIComponent(garageId)}/image`,
    { method: "POST", body: form },
  );
}

// Communities & Events
export async function fetchCommunities(params?: {
  search?: string;
  joined_only?: boolean;
}): Promise<CommunitySummary[]> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.joined_only) qs.set("joined_only", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return authRequest<CommunitySummary[]>(`/communities${suffix}`);
}

export async function joinCommunity(communityId: string): Promise<void> {
  await authRequest(`/communities/${encodeURIComponent(communityId)}/join`, { method: "POST" });
}

export async function leaveCommunity(communityId: string): Promise<void> {
  await authRequest(`/communities/${encodeURIComponent(communityId)}/leave`, { method: "POST" });
}

export async function fetchCommunityEvents(): Promise<CommunityEventItem[]> {
  return authRequest<CommunityEventItem[]>("/events");
}

export async function rsvpCommunityEvent(
  eventId: string,
  status: "going" | "interested" | "not_going",
): Promise<void> {
  await authRequest(`/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// Direct Messages
export async function fetchDirectConversations(): Promise<DirectConversationItem[]> {
  return authRequest<DirectConversationItem[]>("/messages/conversations");
}

export async function fetchDirectMessages(
  userId: string,
  limit = 50,
): Promise<DirectMessageItem[]> {
  return authRequest<DirectMessageItem[]>(`/messages/${encodeURIComponent(userId)}?limit=${limit}`);
}

export async function sendDirectMessage(
  userId: string,
  message: string,
): Promise<DirectMessageItem> {
  return authRequest<DirectMessageItem>(`/messages/${encodeURIComponent(userId)}`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Support Tickets (Rider)
export async function fetchSupportPurposes(): Promise<SupportPurposeItem[]> {
  return authRequest<SupportPurposeItem[]>("/support/purposes");
}

export async function fetchMySupportTickets(): Promise<UserSupportTicketItem[]> {
  return authRequest<UserSupportTicketItem[]>("/support/tickets/me");
}

export async function createSupportTicket(payload: {
  purpose_id?: string;
  purpose_code?: string;
  phone_number?: string;
  message: string;
}): Promise<UserSupportTicketItem> {
  return authRequest<UserSupportTicketItem>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replySupportTicket(ticketId: string, message: string): Promise<void> {
  await authRequest(`/support/tickets/${encodeURIComponent(ticketId)}/replies`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
