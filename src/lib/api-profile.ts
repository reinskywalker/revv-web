import { AuthApiError, authRequest, getApiBaseUrl, getSavedSession } from "./api-core";
import type {
  FriendRequestItem,
  FriendUserItem,
  PublicProfileGarageItem,
  PublicProfileResponse,
  RiderProfile,
  SocialRiderSearchResult,
  UserAchievementItem,
  UserAchievementsPayload,
} from "./api-types";

export function mapRiderProfileToPublicProfile(myProf: RiderProfile): PublicProfileResponse {
  return {
    id: myProf.id,
    username: myProf.username || "rider",
    noreg: myProf.noreg || null,
    first_name: myProf.first_name || null,
    middle_name: myProf.middle_name || null,
    last_name: myProf.last_name || null,
    avatar_url: myProf.avatar_url || null,
    equipped_frame_code: myProf.equipped_frame_code ?? null,
    equipped_badges: myProf.equipped_badges ?? [],
    is_verified_profile: myProf.is_verified_profile ?? false,
    subscription_tier: myProf.subscription_tier ?? null,
    banner_url: myProf.banner_url || null,
    bio: myProf.bio || null,
    city: myProf.city || null,
    country: myProf.country ?? null,
    job: myProf.job || null,
    account_visibility:
      (myProf.account_visibility as PublicProfileResponse["account_visibility"]) || "PUBLIC",
    show_motorcycle_count: myProf.show_motorcycle_count ?? null,
    show_garage_details: myProf.show_garage_details ?? null,
    show_city: myProf.show_city ?? null,
    show_country: myProf.show_country ?? null,
    show_job: myProf.show_job ?? null,
    show_achievements: myProf.show_achievements ?? null,
    show_riding_stats: myProf.show_riding_stats ?? null,
    privacy_country: myProf.privacy_country ?? null,
    privacy_saved_routes: myProf.privacy_saved_routes ?? null,
    is_friend: true,
    has_pending_request: false,
    is_private: false,
    motorcycle_count: null,
    garage: null,
    posts: null,
  };
}

/**
 * Rider Portal APIs (Authenticated)
 */
export async function fetchMyProfile(): Promise<RiderProfile> {
  const profile = await authRequest<RiderProfile>("/me");
  if (typeof window !== "undefined" && profile.username) {
    localStorage.setItem("revv_username", profile.username);
    localStorage.setItem("revv_rider_id", profile.username);
  }
  return profile;
}

export async function fetchPublicUserAchievements(
  identifier: string,
): Promise<UserAchievementsPayload> {
  const clean = identifier.trim() || "me";
  const session = getSavedSession();
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (session.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(clean)}/achievements`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AuthApiError(
      body?.meta?.message || `Unable to load achievements (${res.status})`,
      res.status,
      res.status === 404,
    );
  }
  const body = await res.json();
  const raw = (body?.data ?? body ?? {}) as {
    summary?: Partial<UserAchievementsPayload["summary"]>;
    pinned_codes?: string[];
    achievements?: UserAchievementItem[];
    items?: UserAchievementItem[];
  };
  const rawSummary: Partial<UserAchievementsPayload["summary"]> = raw.summary ?? {};
  const pinnedCodes = Array.isArray(rawSummary.pinned_codes)
    ? rawSummary.pinned_codes
    : Array.isArray(raw.pinned_codes)
      ? raw.pinned_codes
      : [];
  const rawList = Array.isArray(raw.achievements)
    ? raw.achievements
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const normalizedList: UserAchievementItem[] = rawList.map((item) => ({
    ...item,
    current_value: Number(item.current_value ?? 0),
    highest_level: Number(item.highest_level ?? 0),
    max_level: Number(item.max_level ?? 1),
    tiers: Array.isArray(item.tiers) ? item.tiers : [],
  }));

  return {
    summary: {
      total_achieved: Number(rawSummary.total_achieved ?? 0),
      total_categories: Number(rawSummary.total_categories ?? normalizedList.length),
      badges_unlocked: Number(rawSummary.badges_unlocked ?? 0),
      total_badge_tiers: Number(rawSummary.total_badge_tiers ?? 0),
      milestones_achieved: Number(rawSummary.milestones_achieved ?? 0),
      total_milestones: Number(rawSummary.total_milestones ?? 0),
      total_xp: Number(rawSummary.total_xp ?? 0),
      ...(rawSummary.rank_title ? { rank_title: rawSummary.rank_title } : {}),
      pinned_codes: pinnedCodes,
    },
    pinned_codes: pinnedCodes,
    achievements: normalizedList,
    items: normalizedList,
  };
}

export async function fetchFriends(): Promise<FriendUserItem[]> {
  return authRequest<FriendUserItem[]>("/friends");
}

export async function fetchFriendRequests(): Promise<FriendRequestItem[]> {
  return authRequest<FriendRequestItem[]>("/friends/requests");
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await authRequest(`/friends/requests/${encodeURIComponent(requestId)}/accept`, {
    method: "POST",
  });
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await authRequest(`/friends/requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
  });
}

export async function searchRiders(query: string): Promise<SocialRiderSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];
  return authRequest<SocialRiderSearchResult[]>(
    `/riders/social-search?q=${encodeURIComponent(clean)}`,
  );
}

export function getGoogleOAuthUrl(): string {
  return `${getApiBaseUrl()}/auth/google`;
}

export async function deleteProfileAvatar(): Promise<void> {
  await authRequest("/me/avatar", { method: "DELETE" });
}

export async function deleteProfileBanner(): Promise<void> {
  await authRequest("/me/banner", { method: "DELETE" });
}

export async function fetchPublicProfile(identifier: string): Promise<PublicProfileResponse> {
  const clean = identifier.trim() || "me";
  const session = getSavedSession();

  if (session.token) {
    try {
      const res = await authRequest<
        PublicProfileResponse & { garage_details?: PublicProfileGarageItem[] | null }
      >(`/users/${encodeURIComponent(clean)}/profile`);
      if (res) {
        if (!res.garage && res.garage_details) {
          res.garage = res.garage_details;
        }
        return res;
      }
    } catch {
      // If viewing self and public endpoint fails, fall back to /me
      if (clean === "me" || clean === session.username || clean === session.riderId) {
        const myProf = await fetchMyProfile();
        return mapRiderProfileToPublicProfile(myProf);
      }
    }
  }

  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(clean)}/profile`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new AuthApiError(`Rider profile not found (${res.status})`, res.status);
  }
  const body = await res.json().catch(() => null);
  const data = body?.data ?? body;
  if (data && !data.garage && data.garage_details) {
    data.garage = data.garage_details;
  }
  return data;
}

export async function sendFriendRequest(friendId: string): Promise<{ status: string }> {
  return authRequest<{ status: string }>("/friends/request", {
    method: "POST",
    body: JSON.stringify({ friend_id: friendId }),
  });
}

export async function cancelFriendRequest(friendIdOrRequestId: string): Promise<void> {
  await authRequest<unknown>(
    `/friends/requests/${encodeURIComponent(friendIdOrRequestId)}/cancel`,
    {
      method: "POST",
    },
  );
}

export async function unfriendRider(friendId: string): Promise<void> {
  await authRequest<unknown>(`/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
  });
}

export async function updateMyProfile(payload: {
  username?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  country?: string;
  job?: string;
  avatar_url?: string;
  banner_url?: string;
  account_visibility?: string;
  show_motorcycle_count?: boolean;
  show_garage_details?: boolean;
  show_city?: boolean;
  show_country?: boolean;
  show_job?: boolean;
  privacy_country?: string;
  privacy_saved_routes?: string;
  leaderboard_opt_in?: boolean;
}): Promise<RiderProfile> {
  return authRequest<RiderProfile>("/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
