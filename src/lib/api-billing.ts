/**
 * REVV Web Billing, Subscriptions, Paddock Club Boost & Account Deletion API Client.
 *
 * 100% DB-driven pricing: never defines or hardcodes price constants.
 */
import { authRequest } from "./api";

export interface PlanPriceOption {
  plan_key: string;
  tier_code: string;
  billing_period: string;
  account_scope: string;
  brand_name: string;
  label: string;
  tagline: string;
  google_play_sku?: string | null;
  duration_hours: number;
  currency: string;
  amount: number;
  price_idr: number;
  price_usd_cents: number;
}

export interface SubscriptionPlanGroup {
  tier_code: string;
  name: string;
  tagline: string;
  is_paid: boolean;
  limits: {
    radar_radius_km?: number;
    hosted_voice_riders?: number;
    garage_bikes?: number;
    saved_routes?: number;
    daily_traffic_routes?: number;
    has_google_traffic_nav?: boolean;
  };
  options: PlanPriceOption[];
}

export interface ClubBoostLevelInfo {
  boost_level: number;
  level_name: string;
  required_boosts: number;
  member_limit: number;
  max_text_channels: number;
  allow_private_channels: boolean;
  max_voice_channels: number;
  max_voice_participants: number;
  max_active_drafts: number;
  allow_custom_roles: boolean;
  allow_vanity_url: boolean;
  allow_animated_frame: boolean;
  is_featured_discover: boolean;
  has_gold_crest: boolean;
}

export interface UserEntitlementsDto {
  tier_code: string;
  brand_name: string;
  billing_period?: string | null;
  is_paid: boolean;
  is_in_grace_period: boolean;
  auto_renew: boolean;
  active_until?: string | null;
  max_radar_meters: number;
  daily_traffic_route_limit: number;
  has_google_traffic_nav: boolean;
  max_hosted_voice_riders: number;
  max_garage_bikes: number;
  max_saved_routes: number;
  is_verified_profile: boolean;
}

export interface SubscriptionPlansCatalogResponse {
  pricing_region: string;
  currency: string;
  phone_verification_required_for_regional_pricing: boolean;
  verified_country_code?: string | null;
  entitlements: UserEntitlementsDto;
  passes: PlanPriceOption[];
  plans: SubscriptionPlanGroup[];
  club_boost: {
    name: string;
    tagline: string;
    item_only_eligible?: boolean;
    item_addon_monthly?: PlanPriceOption | null;
    item_addon_yearly?: PlanPriceOption | null;
    options: PlanPriceOption[];
    levels: ClubBoostLevelInfo[];
  };
}

export function getBillingTierRank(tierCode?: string | null): number {
  switch ((tierCode ?? "").trim().toLowerCase()) {
    case "street":
    case "throttle":
      return 1;
    case "apex":
      return 2;
    case "grand_tourer":
      return 3;
    default:
      return 0;
  }
}

export function getBillingPeriodRank(period?: string | null): number {
  switch ((period ?? "").trim().toLowerCase()) {
    case "weekly":
      return 1;
    case "monthly":
      return 2;
    case "yearly":
    case "annual":
    case "annually":
      return 3;
    default:
      return 0;
  }
}

export function formatDbPrice(currency: string, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free";
  }
  if (currency.toUpperCase() === "IDR") {
    return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
  }
  return `$${(amount / 100).toFixed(2)}`;
}

export async function fetchSubscriptionPlansCatalog(): Promise<SubscriptionPlansCatalogResponse> {
  return authRequest<SubscriptionPlansCatalogResponse>("/subscriptions/plans");
}

export async function cancelMySubscription(
  reason?: string,
): Promise<{ subscription_id: string; auto_renew: boolean; active_until?: string | null }> {
  return authRequest("/me/subscription/cancel", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function equipMyAvatarFrame(frameCode: string | null): Promise<void> {
  await authRequest("/me/frames/equip", {
    method: "PUT",
    body: JSON.stringify({ frame_code: frameCode }),
  });
}

export async function equipMyCosmeticBadges(badgeCodes: string[]): Promise<void> {
  await authRequest("/me/badges/equip", {
    method: "PUT",
    body: JSON.stringify({ badge_codes: badgeCodes }),
  });
}

export async function requestAccountDeletion(reason?: string): Promise<{
  request_id: string;
  status: string;
  active_subscription_provider?: string | null;
  play_store_cancel_warning: boolean;
}> {
  return authRequest("/me/account-deletion-request", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
