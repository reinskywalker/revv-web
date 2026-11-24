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
    idr_override_amount?: number | null;
    label?: string;
    tagline?: string;
    is_active?: boolean;
  },
): Promise<void> {
  await authRequest(`/admin/pricing/plans/${encodeURIComponent(planKey)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
