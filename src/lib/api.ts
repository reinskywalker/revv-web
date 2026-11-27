/**
 * REVV- Web API Client
 * Connects to REVV Backend services (News, Auth/OTP, Profile, Garage, Feed, Admin Console, Beta Registrations)
 */
import { compressImageFile, renderCanvasBlob } from "./image-compress";
import { sanitizeRichHtml } from "./html-sanitizer";
import {
  AuthApiError,
  authRequest,
  authRequestRaw,
  getApiBaseUrl,
  getSavedSession,
  optionalAuthRequest,
} from "./api-core";
import type {
  AdminDashboardStats,
  AdminUserItem,
  ApiResponse,
  FeedPostItem,
  GarageMotorcycle,
  MasterBrandItem,
  MasterComponentItem,
  MasterEmailTemplateItem,
  MasterGeneralSettingItem,
  MasterMotorcycleItem,
  MasterNotificationTemplateItem,
  NewsArticle,
  PublicMasterBrandItem,
  RiderProfile,
} from "./api-types";

export { compressImageFile, sanitizeRichHtml };
export * from "./api-types";
export * from "./api-core";
export * from "./api-news";
export * from "./api-profile";

/**
 * Public master motorcycle brands catalog (`GET /api/v1/master/brands`)
 */
export async function fetchPublicMasterBrands(): Promise<PublicMasterBrandItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/master/brands`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body: ApiResponse<PublicMasterBrandItem[]> = await res.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

/**
 * Public master motorcycle catalog (`GET /api/v1/master/motorcycles?brand_id=...`)
 */
export async function fetchMasterMotorcycles(brandId?: number): Promise<MasterMotorcycleItem[]> {
  try {
    const qs = brandId ? `?brand_id=${brandId}` : "";
    const res = await fetch(`${getApiBaseUrl()}/master/motorcycles${qs}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body: ApiResponse<MasterMotorcycleItem[]> = await res.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

/**
 * Public general settings (`GET /api/v1/master/general-settings`)
 */
export async function fetchPublicGeneralSettings(): Promise<MasterGeneralSettingItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/master/general-settings`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body: ApiResponse<MasterGeneralSettingItem[]> = await res.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export async function updateMyPreferences(payload: {
  theme?: string;
  locale?: string;
  account_visibility?: string;
  privacy_country?: string;
  privacy_saved_routes?: string;
  show_country?: boolean;
  show_motorcycle_count?: boolean;
  show_garage_details?: boolean;
  show_city?: boolean;
  show_job?: boolean;
  leaderboard_opt_in?: boolean;
}): Promise<Record<string, unknown>> {
  return authRequest<Record<string, unknown>>("/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function checkUsernameAvailability(username: string): Promise<{
  available: boolean;
  reason?: string | null;
  message?: string;
}> {
  const clean = username.trim();
  if (!clean) {
    return { available: false, reason: "invalid", message: "Username is required" };
  }
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/users/check-username?u=${encodeURIComponent(clean)}`,
      { headers: { Accept: "application/json" } },
    );
    const body = await res.json().catch(() => null);
    const data = body?.data ?? body;
    return {
      available: Boolean(data?.available),
      reason: data?.reason ?? null,
      message: data?.message,
    };
  } catch {
    return { available: true };
  }
}

export async function uploadProfileAvatar(file: File): Promise<{ url: string; path: string }> {
  const compressed = await compressImageFile(file, 1080, 0.82);
  const form = new FormData();
  form.append("image", compressed);
  return authRequest<{ url: string; path: string }>("/me/avatar", {
    method: "POST",
    body: form,
  });
}

export async function uploadProfileBanner(file: File): Promise<{ url: string; path: string }> {
  const compressed = await compressImageFile(file, 2048, 0.8);
  const form = new FormData();
  form.append("image", compressed);
  return authRequest<{ url: string; path: string }>("/me/banner", {
    method: "POST",
    body: form,
  });
}

export async function fetchMyGarage(): Promise<GarageMotorcycle[]> {
  return authRequest<GarageMotorcycle[]>("/me/garage");
}

export async function addGarageMotorcycle(payload: {
  master_motorcycle_id?: number | null;
  brand_manual?: string;
  series_manual?: string;
  nickname?: string;
  current_mileage?: number;
  manufacture_year?: number;
  engine_capacity_cc?: number;
  transmission?: string;
  category?: string;
  plate_number?: string;
  avg_daily_mileage?: number;
  is_primary?: boolean;
}): Promise<GarageMotorcycle> {
  return authRequest<GarageMotorcycle>("/me/garage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGarageMotorcycle(
  garageId: string,
  payload: Partial<{
    master_motorcycle_id: number | null;
    brand_manual: string;
    series_manual: string;
    nickname: string;
    current_mileage: number;
    manufacture_year: number;
    engine_capacity_cc: number;
    transmission: string;
    category: string;
    plate_number: string;
    avg_daily_mileage: number;
    is_primary: boolean;
  }>,
): Promise<GarageMotorcycle> {
  return authRequest<GarageMotorcycle>(`/me/garage/${encodeURIComponent(garageId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteGarageMotorcycle(garageId: string): Promise<void> {
  await authRequest<unknown>(`/me/garage/${encodeURIComponent(garageId)}`, {
    method: "DELETE",
  });
}

export async function fetchFeedPosts(): Promise<FeedPostItem[]> {
  return authRequest<FeedPostItem[]>("/feed/posts");
}

export async function createStatusPost(payload: {
  caption: string;
  visibility?: string;
  motorcycle_label?: string;
  bike_label?: string;
}): Promise<FeedPostItem> {
  const normVis = payload.visibility === "FRIENDS" ? "FRIENDS_ONLY" : payload.visibility;
  return authRequest<FeedPostItem>("/feed/status", {
    method: "POST",
    body: JSON.stringify({
      caption: payload.caption,
      visibility: normVis,
      motorcycle_label: payload.motorcycle_label ?? payload.bike_label,
    }),
  });
}

export async function deleteFeedPost(postId: string): Promise<void> {
  await authRequest<unknown>(`/feed/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export interface PostCommentItem {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  comment: string;
  created_at: string;
}

export async function likeFeedPost(
  postId: string,
): Promise<{ liked: boolean; like_count: number }> {
  return authRequest<{ liked: boolean; like_count: number }>(
    `/feed/posts/${encodeURIComponent(postId)}/like`,
    {
      method: "POST",
    },
  );
}

export async function unlikeFeedPost(
  postId: string,
): Promise<{ liked: boolean; like_count: number }> {
  return authRequest<{ liked: boolean; like_count: number }>(
    `/feed/posts/${encodeURIComponent(postId)}/like`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchFeedComments(postId: string): Promise<PostCommentItem[]> {
  return authRequest<PostCommentItem[]>(`/feed/posts/${encodeURIComponent(postId)}/comments`);
}

export async function createFeedComment(postId: string, comment: string): Promise<PostCommentItem> {
  return authRequest<PostCommentItem>(`/feed/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export async function deleteFeedComment(postId: string, commentId: string): Promise<void> {
  await authRequest<unknown>(
    `/feed/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  );
}

/**
 * Administrator Console APIs (`role === 'administrator'`)
 */
export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  return authRequest<AdminDashboardStats>("/admin/dashboard");
}

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  return authRequest<AdminUserItem[]>("/users");
}

export async function updateAdminUser(
  userId: string,
  payload: {
    username?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    bio?: string;
    role?: string;
    status?: string;
  },
): Promise<AdminUserItem> {
  return authRequest<AdminUserItem>(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserStatus(
  userId: string,
  status: string,
): Promise<AdminUserItem> {
  return authRequest<AdminUserItem>(`/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await authRequest<unknown>(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export interface SubscriptionTierCatalogItem {
  tier_code: "rookie" | "street" | "apex" | "grand_tourer";
  name: string;
  is_paid: boolean;
  idr_weekly: number;
  idr_monthly: number;
  idr_yearly: number;
  usd_weekly_cents: number;
  usd_monthly_cents: number;
  usd_yearly_cents: number;
  includes_verified_frame: boolean;
}

export interface AdminSubscriptionItem {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  user_role: string;
  plan_code: string;
  tier_code: string;
  billing_period: string;
  status: string;
  active_from: string | null;
  active_until: string | null;
  purchased_at: string;
  duration_days: number | null;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  payment_channel: string | null;
  paid_by_label: string | null;
  account_scope: string;
  is_consecutive: boolean;
  consecutive_months: number;
  consecutive_cycles: number;
  total_paid_days: number;
  auto_renew: boolean;
  equipped_frame_code: string | null;
  admin_notes: string | null;
  updated_at: string;
}

export interface SubscriptionEventItem {
  id: string;
  subscription_id: string | null;
  user_id: string;
  username: string;
  event_type: string;
  actor_username: string | null;
  previous_tier: string | null;
  new_tier: string | null;
  previous_status: string | null;
  new_status: string | null;
  delta_days: number | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
}

export interface AdminSubscriptionsPayload {
  tiers: SubscriptionTierCatalogItem[];
  active_count: number;
  total_count: number;
  subscriptions: AdminSubscriptionItem[];
  events: SubscriptionEventItem[];
}

export interface AssignSubscriptionPayload {
  user_id: string;
  tier_code: string;
  billing_period?: string;
  duration_days?: number;
  amount?: number;
  currency?: string;
  payment_method?: string;
  payment_provider?: string;
  payment_channel?: string;
  paid_by_label?: string;
  account_scope?: string;
  is_consecutive?: boolean;
  consecutive_months?: number;
  auto_renew?: boolean;
  admin_notes?: string;
}

export async function fetchAdminSubscriptions(): Promise<AdminSubscriptionsPayload> {
  return authRequest<AdminSubscriptionsPayload>("/admin/subscriptions");
}

export async function assignAdminSubscription(
  payload: AssignSubscriptionPayload,
): Promise<Record<string, unknown>> {
  return authRequest<Record<string, unknown>>("/admin/subscriptions/assign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeAdminSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<Record<string, unknown>> {
  return authRequest<Record<string, unknown>>(
    `/admin/subscriptions/${encodeURIComponent(subscriptionId)}/revoke`,
    {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );
}

export async function fetchAdminBrands(): Promise<MasterBrandItem[]> {
  return authRequest<MasterBrandItem[]>("/admin/master/brands");
}

export async function createAdminBrand(payload: {
  name: string;
  is_active?: boolean;
}): Promise<MasterBrandItem> {
  return authRequest<MasterBrandItem>("/admin/master/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminBrand(
  id: number,
  payload: { name?: string; is_active?: boolean },
): Promise<MasterBrandItem> {
  return authRequest<MasterBrandItem>(`/admin/master/brands/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminBrand(id: number): Promise<void> {
  await authRequest<unknown>(`/admin/master/brands/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminMotorcycles(): Promise<MasterMotorcycleItem[]> {
  return authRequest<MasterMotorcycleItem[]>("/admin/master/motorcycles");
}

export async function createAdminMotorcycle(payload: {
  brand_id: number;
  series_name: string;
  transmission: string;
  category: string;
  engine_cc?: number | null;
  is_active?: boolean;
}): Promise<MasterMotorcycleItem> {
  return authRequest<MasterMotorcycleItem>("/admin/master/motorcycles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminMotorcycle(
  id: number,
  payload: {
    brand_id?: number;
    series_name?: string;
    transmission?: string;
    category?: string;
    engine_cc?: number | null;
    is_active?: boolean;
  },
): Promise<MasterMotorcycleItem> {
  return authRequest<MasterMotorcycleItem>(`/admin/master/motorcycles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminMotorcycle(id: number): Promise<void> {
  await authRequest<unknown>(`/admin/master/motorcycles/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminComponents(): Promise<MasterComponentItem[]> {
  return authRequest<MasterComponentItem[]>("/admin/master/components");
}

export async function createAdminComponent(payload: {
  code: string;
  name: string;
  name_id?: string;
  name_en?: string;
  default_interval_km?: number | null;
  default_interval_months?: number | null;
  applicable_transmission?: string[];
  is_active?: boolean;
}): Promise<MasterComponentItem> {
  return authRequest<MasterComponentItem>("/admin/master/components", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminComponent(
  id: number,
  payload: {
    code?: string;
    name?: string;
    name_id?: string;
    name_en?: string;
    default_interval_km?: number | null;
    default_interval_months?: number | null;
    applicable_transmission?: string[];
    is_active?: boolean;
  },
): Promise<MasterComponentItem> {
  return authRequest<MasterComponentItem>(`/admin/master/components/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminComponent(id: number): Promise<void> {
  await authRequest<unknown>(`/admin/master/components/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminNotificationTemplates(): Promise<MasterNotificationTemplateItem[]> {
  return authRequest<MasterNotificationTemplateItem[]>("/admin/master/notification-templates");
}

export async function createAdminNotificationTemplate(payload: {
  code: string;
  category: string;
  name: string;
  title_template: string;
  body_template: string;
  language: string;
  variables_hint?: string;
}): Promise<MasterNotificationTemplateItem> {
  return authRequest<MasterNotificationTemplateItem>("/admin/master/notification-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminNotificationTemplate(
  id: number,
  payload: Partial<{
    code: string;
    category: string;
    name: string;
    title_template: string;
    body_template: string;
    language: string;
    variables_hint: string;
  }>,
): Promise<MasterNotificationTemplateItem> {
  return authRequest<MasterNotificationTemplateItem>(`/admin/master/notification-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminNotificationTemplate(id: number): Promise<void> {
  await authRequest<unknown>(`/admin/master/notification-templates/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminEmailTemplates(): Promise<MasterEmailTemplateItem[]> {
  return authRequest<MasterEmailTemplateItem[]>("/admin/master/email-templates");
}

export async function createAdminEmailTemplate(payload: {
  code: string;
  name: string;
  subject_template: string;
  html_body: string;
  variables_hint?: string;
}): Promise<MasterEmailTemplateItem> {
  return authRequest<MasterEmailTemplateItem>("/admin/master/email-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminEmailTemplate(
  id: number,
  payload: Partial<{
    code: string;
    name: string;
    subject_template: string;
    html_body: string;
    variables_hint: string;
  }>,
): Promise<MasterEmailTemplateItem> {
  return authRequest<MasterEmailTemplateItem>(`/admin/master/email-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminGeneralSettings(): Promise<MasterGeneralSettingItem[]> {
  return authRequest<MasterGeneralSettingItem[]>("/admin/master/general-settings");
}

export async function updateAdminGeneralSetting(
  id: number,
  payload: { setting_value: string; label?: string; description?: string },
): Promise<MasterGeneralSettingItem> {
  return authRequest<MasterGeneralSettingItem>(`/admin/master/general-settings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface BroadcastNotificationItem {
  id: string;
  sender_id: string | null;
  title: string;
  body: string;
  target_type: "all" | "user";
  target_user_id: string | null;
  data_payload?: Record<string, unknown> | null;
  sent_count: number;
  created_at: string;
}

export interface SendBroadcastNotificationPayload {
  title: string;
  body: string;
  target_type?: "all" | "user";
  target_user_id?: string | null | undefined;
  data?: Record<string, unknown>;
}

export async function fetchAdminBroadcasts(): Promise<BroadcastNotificationItem[]> {
  return authRequest<BroadcastNotificationItem[]>("/admin/notifications/broadcasts");
}

export async function sendAdminBroadcast(
  payload: SendBroadcastNotificationPayload,
): Promise<{ broadcast_id: string; sent_count: number }> {
  return authRequest<{ broadcast_id: string; sent_count: number }>(
    "/admin/notifications/broadcast",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export interface WebNotificationItem {
  id: string;
  user_id: string;
  actor_id?: string | null;
  actor_username?: string | null;
  actor_avatar_url?: string | null;
  notif_type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchMyNotifications(): Promise<WebNotificationItem[]> {
  return authRequest<WebNotificationItem[]>("/notifications");
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await authRequest<unknown>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await authRequest<unknown>("/notifications", {
    method: "PUT",
  });
}

export async function deleteNotificationById(id: string): Promise<void> {
  await authRequest<unknown>(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function clearAllMyNotifications(): Promise<void> {
  await authRequest<unknown>("/notifications", {
    method: "DELETE",
  });
}

export interface SystemHealthStatus {
  status: "ok" | "maintenance";
  maintenance: boolean;
  title: string;
  message: string;
  icon: string;
  server_time?: string;
  isDown?: boolean;
}

export async function fetchSystemHealth(): Promise<SystemHealthStatus> {
  const baseUrl = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status === 503) {
        const body = await res.json().catch(() => null);
        if (body?.data?.maintenance) {
          return {
            status: "maintenance",
            maintenance: true,
            title: body.data.title || "Under Scheduled Maintenance",
            message: body.data.message || "REVV is currently undergoing maintenance.",
            icon: body.data.icon || "wrench",
          };
        }
      }
      return {
        status: "maintenance",
        maintenance: true,
        isDown: true,
        title: "Server Offline",
        message: "Unable to connect to the REVV backend. Please check back shortly.",
        icon: "cloud_off",
      };
    }
    const data = await res.json();
    return {
      status: data.status || "ok",
      maintenance: Boolean(data.maintenance),
      title: data.title || "Under Scheduled Maintenance",
      message: data.message || "REVV is currently undergoing maintenance.",
      icon: data.icon || "wrench",
      server_time: data.server_time,
    };
  } catch {
    return {
      status: "maintenance",
      maintenance: true,
      isDown: true,
      title: "Server Offline",
      message: "Unable to connect to the REVV backend. Please check back shortly.",
      icon: "cloud_off",
    };
  }
}

export interface CurrentRiderProfile {
  id: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  username?: string | null;
}

export interface SystemStatusConfig {
  id: string;
  is_maintenance: boolean;
  title: string;
  message: string;
  icon: string;
  updated_by?: string | null;
  updated_at?: string;
}

export type AdminSystemStatusRecord = SystemStatusConfig;

export interface SupportTicketMessageItem {
  id: string;
  ticket_id: string;
  sender_id?: string | null;
  sender_role: "user" | "admin" | string;
  sender_name?: string | null;
  message: string;
  created_at: string;
}

export interface SupportTicketItem {
  id: string;
  user_id: string;
  purpose_label: string;
  submission_counter: number;
  noreg: string;
  reference_code: string;
  reporter_name: string;
  reporter_phone: string;
  reporter_email: string;
  message: string;
  status: string;
  admin_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
  device_info?: Record<string, unknown> | null;
  can_user_reply?: boolean;
  messages?: SupportTicketMessageItem[];
}

export interface LegalDocumentItem {
  id: string;
  slug: string;
  title: string;
  content_html: string;
  jurisdictions: string;
  version: string;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
}

export async function fetchCurrentUser(): Promise<CurrentRiderProfile | null> {
  const { token } = getSavedSession();
  if (!token) return null;
  try {
    return await authRequest<CurrentRiderProfile>("/me");
  } catch {
    return null;
  }
}

export async function fetchAdminSystemStatus(): Promise<SystemStatusConfig> {
  return authRequest<SystemStatusConfig>("/admin/system/status");
}

export async function updateAdminSystemStatus(payload: {
  is_maintenance: boolean;
  title?: string;
  message?: string;
  icon?: string;
}): Promise<SystemStatusConfig> {
  return authRequest<SystemStatusConfig>("/admin/system/status", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminNewsArticles(): Promise<NewsArticle[]> {
  return authRequest<NewsArticle[]>("/admin/news");
}

export async function createAdminNewsArticle(payload: {
  title: string;
  slug?: string;
  summary: string;
  content: string;
  category?: string;
  author_name?: string;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  reading_time_minutes?: number;
  is_highlight?: boolean;
  high_importance?: boolean;
}): Promise<{ id: string; slug: string; push_sent_count?: number }> {
  return authRequest<{ id: string; slug: string; push_sent_count?: number }>("/admin/news", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminNewsArticle(
  articleId: string,
  payload: {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    category?: string;
    author_name?: string;
    cover_image_url?: string | null;
    thumbnail_url?: string | null;
    reading_time_minutes?: number;
    is_highlight?: boolean;
    high_importance?: boolean;
  },
): Promise<{ id: string; push_sent_count?: number }> {
  return authRequest<{ id: string; push_sent_count?: number }>(
    `/admin/news/${encodeURIComponent(articleId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteAdminNewsArticle(articleId: string): Promise<void> {
  await authRequest<unknown>(`/admin/news/${encodeURIComponent(articleId)}`, {
    method: "DELETE",
  });
}

export async function fetchAdminSupportTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ tickets: SupportTicketItem[]; total: number; totalPages: number }> {
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 20),
  });
  if (params?.status && params.status !== "ALL") {
    q.set("status", params.status);
  }
  const body = await authRequestRaw<SupportTicketItem[]>(`/admin/support/tickets?${q.toString()}`);
  const meta = (body.results as { total?: number; total_pages?: number } | undefined) ?? {};
  return {
    tickets: body.data ?? [],
    total: meta.total ?? body.data?.length ?? 0,
    totalPages: meta.total_pages ?? 1,
  };
}

export async function replyAdminSupportTicket(
  ticketId: string,
  reply: string,
  status = "Replied",
): Promise<{ ticket: SupportTicketItem; push_sent_count: number }> {
  return authRequest<{ ticket: SupportTicketItem; push_sent_count: number }>(
    `/admin/support/tickets/${encodeURIComponent(ticketId)}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ reply, status }),
    },
  );
}

export async function fetchLegalDocuments(): Promise<LegalDocumentItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/legal`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as ApiResponse<LegalDocumentItem[]> | null;
    return body?.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchAdminLegalDocuments(): Promise<LegalDocumentItem[]> {
  return authRequest<LegalDocumentItem[]>("/admin/legal");
}

export async function upsertAdminLegalDocument(
  slug: string,
  payload: {
    title: string;
    content_html: string;
    jurisdictions: string;
    version: string;
    is_published: boolean;
    sort_order: number;
  },
): Promise<LegalDocumentItem> {
  return authRequest<LegalDocumentItem>(`/admin/legal/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadCompressedMedia(file: File): Promise<{
  url: string;
  thumbnail_url: string;
  size: number;
}> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Invalid image file"));
      el.src = objectUrl;
    });

    const mainAsset = await renderCanvasBlob(img, 1280, 0.82);
    const thumbAsset = await renderCanvasBlob(img, 480, 0.72);

    const form = new FormData();
    form.append("file", mainAsset.blob, `image.${mainAsset.ext}`);
    form.append("thumbnail", thumbAsset.blob, `thumb.${thumbAsset.ext}`);

    const data = await authRequest<{
      url: string;
      thumbnail_url: string;
      size: number;
    }>("/media", {
      method: "POST",
      body: form,
    });
    if (!data?.url) {
      throw new AuthApiError("Media upload failed", 500);
    }
    return data;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ============================================================================
// LEADERBOARD, ADMIN ANALYTICS & ADMIN TRIP RECORDS
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  is_verified_profile?: boolean;
  city?: string | null;
  country?: string | null;
  primary_bike?: string | null;
  total_distance_km: number;
  total_trips: number;
  total_duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  refreshed_at: string;
}

export interface LeaderboardResponse {
  snapshot_date: string;
  refreshed_at: string;
  next_refresh_wib: string;
  entries: LeaderboardEntry[];
}

export async function fetchPublicLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(`${getApiBaseUrl()}/leaderboard`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new AuthApiError("Failed to load leaderboard", res.status);
  }
  const payload: ApiResponse<LeaderboardResponse> = await res.json();
  return payload.data;
}

export async function adminRefreshLeaderboard(): Promise<LeaderboardResponse> {
  return authRequest<LeaderboardResponse>("/admin/leaderboard/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export interface DailyAnalyticsSeriesItem {
  day: string;
  new_users: number;
  active_riders: number;
  trips_count: number;
  distance_km: number;
}

export interface AnalyticsBucketItem {
  label: string;
  count: number;
  distance_km: number;
}

export interface HourlyActivityItem {
  hour_wib: number;
  trips_count: number;
}

export interface UserTelemetryMetricItem {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  role: string;
  status: string;
  last_login_at?: string | null;
  last_active_at?: string | null;
  login_count: number;
  session_count: number;
  last_platform?: string | null;
  last_app_version?: string | null;
  last_device_model?: string | null;
  total_trips: number;
  total_distance_km: number;
  max_speed_kmh: number;
  created_at: string;
}

export interface AdminAnalyticsResponse {
  summary: {
    total_users: number;
    active_24h: number;
    active_7d: number;
    active_30d: number;
    dau_mau_pct: number;
    new_users_7d: number;
    new_users_30d: number;
    total_trips: number;
    total_distance_km: number;
    total_duration_hours: number;
    avg_trip_distance_km: number;
    avg_trip_duration_min: number;
    avg_speed_kmh: number;
    max_speed_kmh: number;
    total_clubs: number;
    total_posts: number;
  };
  daily_series: DailyAnalyticsSeriesItem[];
  distance_buckets: AnalyticsBucketItem[];
  hourly_distribution: HourlyActivityItem[];
  top_brands: Array<{ brand: string; count: number }>;
  user_metrics: UserTelemetryMetricItem[];
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return authRequest<AdminAnalyticsResponse>("/admin/analytics");
}

export interface AdminTripRecordItem {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  title: string;
  status: string;
  visibility: string;
  start_time: string;
  end_time?: string | null;
  total_distance_km: number;
  total_duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  origin_name?: string | null;
  destination_name?: string | null;
  max_lean_deg: number;
  points_count: number;
  created_at: string;
}

export interface AdminTripsPaginatedResponse {
  items: AdminTripRecordItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminRiderTripGroup {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  total_trips: number;
  total_distance_km: number;
  total_duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  last_trip_at?: string | null;
  trips: AdminTripRecordItem[];
}

export interface AdminRiderTripsPaginatedResponse {
  items: AdminRiderTripGroup[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminTripDetailRecord {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  title: string;
  status: string;
  visibility: string;
  start_time: string;
  end_time?: string | null;
  total_distance_km: number;
  total_duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  polyline_points: unknown;
  telemetry_data: Record<string, unknown>;
  created_at: string;
}

export async function fetchAdminTrips(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminTripsPaginatedResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return authRequest<AdminTripsPaginatedResponse>(`/admin/trips${suffix}`);
}

export async function fetchAdminTripsByRider(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminRiderTripsPaginatedResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return authRequest<AdminRiderTripsPaginatedResponse>(`/admin/trips/riders${suffix}`);
}

export async function fetchAdminTripDetail(tripId: string): Promise<AdminTripDetailRecord> {
  return authRequest<AdminTripDetailRecord>(`/admin/trips/${encodeURIComponent(tripId)}`);
}
