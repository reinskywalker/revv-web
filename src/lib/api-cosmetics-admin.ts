/**
 * REVV Web Admin Console API Client for DB-Stored Lottie Cosmetics & Live DB Pricing.
 */
import { authRequest } from "./api";
import type { CosmeticBadgeItem, CosmeticFrameItem } from "./cosmetics-cache";

export interface AdminCosmeticsResponse {
  frames: (CosmeticFrameItem & { is_active: boolean; sort_order: number; updated_at: string })[];
  badges: (CosmeticBadgeItem & { is_active: boolean; sort_order: number; updated_at: string })[];
}

export interface AdminUpsertCosmeticPayload {
  code?: string;
  title: string;
  description: string;
  category?: string;
  source_type?: string;
  condition_type?: string;
  condition_target_code?: string | null;
  event_id?: string | null;
  min_tier_code?: string | null;
  required_consecutive_months?: number;
  price_idr?: number | null;
  price_usd_cents?: number | null;
  is_verified_badge?: boolean;
  is_animated?: boolean;
  is_active?: boolean;
  sort_order?: number;
  lottie_json?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface AdminPlanPriceItem {
  plan_key: string;
  tier_code: string;
  billing_period: string;
  account_scope: string;
  brand_name: string;
  label: string;
  tagline: string;
  google_play_sku?: string | null;
  base_price_usd_cents: number;
  idr_override_amount?: number | null;
  duration_hours: number;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface AdminRegionalRuleItem {
  region_code: string;
  currency_code: string;
  usd_to_local_rate: number;
  discount_factor: number;
  label: string;
  is_active: boolean;
}

export async function fetchAdminCosmetics(): Promise<AdminCosmeticsResponse> {
  return authRequest<AdminCosmeticsResponse>("/admin/cosmetics");
}

export async function saveAdminFrame(
  payload: AdminUpsertCosmeticPayload,
  existingCode?: string,
): Promise<{ code: string; asset_hash?: string | null }> {
  if (existingCode) {
    return authRequest(`/admin/cosmetics/frames/${encodeURIComponent(existingCode)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return authRequest("/admin/cosmetics/frames", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveAdminFrame(code: string): Promise<void> {
  await authRequest(`/admin/cosmetics/frames/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

export async function saveAdminBadge(
  payload: AdminUpsertCosmeticPayload,
  existingCode?: string,
): Promise<{ code: string; asset_hash?: string | null }> {
  if (existingCode) {
    return authRequest(`/admin/cosmetics/badges/${encodeURIComponent(existingCode)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return authRequest("/admin/cosmetics/badges", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveAdminBadge(code: string): Promise<void> {
  await authRequest(`/admin/cosmetics/badges/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

export async function fetchAdminPricing(): Promise<{
  plans: AdminPlanPriceItem[];
  regional_rules: AdminRegionalRuleItem[];
}> {
  return authRequest("/admin/pricing");
}

export async function updateAdminPlanPrice(
  planKey: string,
  payload: {
    base_price_usd_cents: number;
    idr_override_amount?: number | null | undefined;
    label?: string | undefined;
    tagline?: string | undefined;
    is_active?: boolean | undefined;
  },
): Promise<void> {
  await authRequest(`/admin/pricing/plans/${encodeURIComponent(planKey)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface AdminUserActivitySummary {
  user_id: string;
  username: string;
  noreg?: string | null;
  email?: string | null;
  last_login_at?: string | null;
  last_active_at?: string | null;
  login_count: number;
  session_count: number;
  last_platform?: string | null;
  last_app_version?: string | null;
  last_device_model?: string | null;
  created_at: string;
}

export interface AdminUserCosmeticsResponse {
  user_id: string;
  is_early_user: boolean;
  has_founding_achievement: boolean;
  equipped_frame_code?: string | null;
  owned_frames: Array<{
    frame_code: string;
    granted_reason: string;
    acquired_at: string;
    expires_at: string;
  }>;
  owned_badges: Array<{
    badge_code: string;
    granted_reason: string;
    acquired_at: string;
    expires_at: string;
    is_equipped: boolean;
  }>;
  activity: AdminUserActivitySummary;
}

export async function fetchAdminUserCosmetics(userId: string): Promise<AdminUserCosmeticsResponse> {
  return authRequest<AdminUserCosmeticsResponse>(
    `/admin/users/${encodeURIComponent(userId)}/cosmetics`,
  );
}

export async function grantAdminUserCosmetic(
  userId: string,
  payload: {
    item_type: "early_user" | "frame" | "badge";
    code?: string | undefined;
    reason?: string | undefined;
    auto_equip?: boolean | undefined;
  },
): Promise<{
  user_id: string;
  item_type: string;
  code?: string;
  frame_code?: string;
  achievement_code?: string;
  bundled_badge_code?: string | null;
}> {
  return authRequest(`/admin/users/${encodeURIComponent(userId)}/cosmetics/grant`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeAdminUserCosmetic(
  userId: string,
  payload: {
    item_type: "early_user" | "frame" | "badge";
    code?: string | undefined;
  },
): Promise<{ user_id: string; item_type: string; code?: string }> {
  return authRequest(`/admin/users/${encodeURIComponent(userId)}/cosmetics/revoke`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
