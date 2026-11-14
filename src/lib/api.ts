/**
 * REVV- Web API Client
 * Connects to REVV Backend services (News, Auth/OTP, Profile, Garage, Feed, Admin Console, Beta Registrations)
 */

export interface NewsArticle {
  id: string;
  slug?: string | null;
  title: string;
  summary: string;
  content: string;
  category: string;
  author_name: string;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  reading_time_minutes: number;
  is_highlight: boolean;
  high_importance?: boolean;
  is_broadcasted?: boolean;
  published_at: string;
}

export interface BackendMeta {
  status: string;
  message: string;
}

export interface ApiResponse<T> {
  meta: BackendMeta;
  data: T;
  results?: unknown;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RequestOtpResponseData {
  otp?: string;
  expires_at?: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  role: string;
  username?: string | null;
  noreg?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
  city?: string | null;
  job?: string | null;
  account_visibility?: string | null;
  show_motorcycle_count?: boolean | null;
  show_garage_details?: boolean | null;
  show_city?: boolean | null;
  show_job?: boolean | null;
}

export interface GarageMotorcycle {
  id: string;
  name: string;
  type: string;
  brand_name?: string | null;
  series_name?: string | null;
  nickname?: string | null;
  current_mileage: number;
  master_motorcycle_id?: number | null;
  manufacture_year?: number | null;
  engine_capacity_cc?: number | null;
  transmission: string;
  category: string;
  plate_number?: string | null;
  avg_daily_mileage: number;
  is_primary: boolean;
  image_path?: string | null;
}

export interface MasterMotorcycleItem {
  id: number;
  brand_id: number;
  brand_name: string;
  series_name: string;
  transmission: string;
  category: string;
  engine_cc?: number | null;
  is_active?: boolean;
}

export interface MasterBrandItem {
  id: number;
  name: string;
  is_active: boolean;
}

export interface MasterComponentItem {
  id: number;
  code: string;
  name: string;
  default_interval_km?: number | null;
  default_interval_months?: number | null;
  applicable_transmission: string[];
  is_active: boolean;
}

export interface FeedPostItem {
  id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  post_type: string;
  caption?: string | null;
  image_url: string;
  motorcycle_label?: string | null;
  metadata: Record<string, unknown>;
  visibility: string;
  like_count: number;
  is_liked_by_me: boolean;
  created_at: string;
  comment_count: number;
}

export interface BetaRegistrationPayload {
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  motorcycle_brand?: string;
  motorcycle_series?: string;
  playstore_email?: string;
  riding_style?: string;
  referral_source?: string;
  notes?: string;
  website?: string;
}

export interface BetaRegistrationRow {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  motorcycle_brand?: string | null;
  motorcycle_series?: string | null;
  playstore_email?: string | null;
  riding_style?: string | null;
  referral_source?: string | null;
  notes?: string | null;
  status: string;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  deleted_users: number;
  pending_registrations: number;
  approved_registrations: number;
  total_garages: number;
  total_feed_posts: number;
  total_communities: number;
  total_master_brands: number;
  total_master_motorcycles: number;
  total_master_components: number;
}

export interface AdminUserItem {
  id: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  noreg?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  status: string;
  role: string;
  created_at: string;
}

// Fallback articles mirroring revv-backend seed database for resilience
export const SEED_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "44444444-5555-6666-7777-888888888801",
    slug: "pre-touring-checklist-preparing-brakes-tires-chain-for-cross-java-routes",
    title: "Pre-Touring Checklist: Preparing Brakes, Tires & Chain for Cross-Java Routes",
    summary:
      "Long-haul highway and mountain stages push brake fluid temperatures, tire pressures, and drive chains far harder than daily commuting.",
    content: `Before rolling out on a multi-hundred-kilometer ride, spend twenty focused minutes inspecting five critical systems.\n\n1. Cold Tire Pressure & Tread Depth\nAlways measure tire pressure cold before departing. Under-inflated tires flex excessively at sustained highway speeds, building heat and accelerating center wear.\n\n2. Brake Pad Thickness & Fluid Clarity\nMountain descents demand crisp hydraulic response. Check front and rear pad grooves and verify brake fluid color in the reservoir.\n\n3. Chain Slack, Lubrication & Sprocket Teeth\nAdjust slack to manufacturer spec with the bike on its side stand or center stand as specified, clean grit with kerosene-safe cleaner, and apply touring-grade chain wax.\n\n4. Fasteners & Luggage Balance\nKeep heavy tools low and centered, torque rack bolts, and verify tail/brake lights remain unobstructed.\n\nLog every replacement in your REVV Digital Garage so mileage intervals alert you well before ride day.`,
    category: "MAINTENANCE",
    author_name: "REVV Garage Desk",
    reading_time_minutes: 4,
    is_highlight: true,
    published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888802",
    slug: "group-ride-intercom-etiquette-keeping-pack-comms-clear-safe",
    title: "Group Ride Intercom Etiquette: Keeping Pack Comms Clear & Safe",
    summary:
      "Clear Road Captain callouts and disciplined Push-to-Talk habits make pack riding smoother for every rider in the formation.",
    content: `Live helmet intercom transforms group riding—when the channel stays crisp and uncluttered.\n\n1. Designate Lead & Sweep Early\nAgree before departure who calls hazards at the front (Lead) and who confirms lane changes or regroups from the rear (Sweep).\n\n2. Concise Hazard Callouts\nUse short, unmistakable phrases: "Gravel left", "Slowing—toll gate ahead", or "Single file". Avoid long stories while navigating technical corners.\n\n3. Use Mute or Push-to-Talk at High Speed\nOpen-visor wind buffeting fatigues everyone on channel. Toggle Push-to-Talk mode in REVV Voice Comms whenever highway wind noise picks up.\n\n4. Regroup at Waypoints, Not Blind Shoulders\nPin fuel and rest waypoints in REVV Navigation ahead of time so no rider feels pressured to rush yellow lights to stay in visual range.`,
    category: "SAFETY & COMMS",
    author_name: "REVV Touring Ops",
    reading_time_minutes: 3,
    is_highlight: true,
    published_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888803",
    slug: "wet-asphalt-cornering-reading-surface-grip-during-tropical-downpours",
    title: "Wet-Asphalt Cornering: Reading Surface Grip During Tropical Downpours",
    summary:
      "The first fifteen minutes of rain lift oil and diesel film onto painted lines and toll approaches. Smooth inputs keep chassis pitch settled.",
    content: `Sudden tropical rain changes road grip dramatically within minutes.\n\n• Give the first 15 minutes extra margin: light rain mixes with traffic residue before heavy runoff washes the lane clean.\n• Avoid painted markings, metal expansion joints, and polished concrete patches while leaned over.\n• Relax your grip on the bars: stiff arms transmit wind gusts directly into steering wobble.\n• Roll on and brake progressively so tire contact patches load smoothly before peak force.`,
    category: "RIDING CRAFT",
    author_name: "REVV Editorial",
    reading_time_minutes: 3,
    is_highlight: false,
    published_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888804",
    slug: "introducing-revv-photo-mode-route-story-overlays",
    title: "Introducing REVV Photo Mode & Route Story Overlays",
    summary:
      "Turn post-ride snapshots into crisp telemetry cards with route polylines, average speed, ride duration, and your Digital Garage machine.",
    content: `Every great ride deserves more than a raw camera roll frame.\n\nWith REVV Route Story, overlay your actual GPS polyline, total distance, ride duration, and average speed onto your favorite summit or rest-stop shot—ready to save to Gallery or share straight to Instagram Stories and TikTok.\n\nPrefer a minimal Strava-inspired aesthetic? Launch REVV Photo Mode to stamp the REVV mark, your @username, your motorcycle identity from Digital Garage, and custom telemetry badges.`,
    category: "PRODUCT",
    author_name: "REVV Team",
    reading_time_minutes: 2,
    is_highlight: false,
    published_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

export function getApiBaseUrl(): string {
  const win = typeof window !== "undefined" ? (window as { __REVV_API_URL__?: string }) : undefined;
  if (win?.__REVV_API_URL__) {
    return win.__REVV_API_URL__;
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("asteralabs.digital") || host.includes("vercel.app")) {
      return "https://revv.asteralabs.digital/api/v1";
    }
  }

  return "http://localhost:8000/api/v1";
}

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const origin = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
  const normalized = trimmed.startsWith("/") ? trimmed : `/uploads/${trimmed}`;
  return `${origin}${normalized}`;
}

/**
 * Fetch news articles from revv-backend /api/v1/news
 */
export async function fetchNewsArticles(params?: {
  page?: number;
  limit?: number;
}): Promise<{ articles: NewsArticle[]; fromFallback: boolean }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const baseUrl = getApiBaseUrl();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${baseUrl}/news?page=${page}&limit=${limit}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: ApiResponse<NewsArticle[]> = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        return { articles: data.data, fromFallback: false };
      }
    }
  } catch (err) {
    console.warn("REVV Backend news endpoint unreachable, using verified seed articles:", err);
  }

  return { articles: SEED_NEWS_ARTICLES, fromFallback: true };
}

/**
 * Fetch a single news article by slug or id from revv-backend /api/v1/news/{slug}
 */
export async function fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${baseUrl}/news/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: ApiResponse<NewsArticle> = await res.json();
      if (data.data) return data.data;
    }
  } catch (err) {
    console.warn("REVV Backend article detail lookup failed:", err);
  }

  const found = SEED_NEWS_ARTICLES.find(
    (a) => a.slug === slug || a.id === slug || a.title.toLowerCase().includes(slug.toLowerCase()),
  );
  return found ?? null;
}

/**
 * Custom error for login & API operations
 */
export class AuthApiError extends Error {
  statusCode: number;
  isNotFound: boolean;

  constructor(message: string, statusCode = 400, isNotFound = false) {
    super(message);
    this.name = "AuthApiError";
    this.statusCode = statusCode;
    this.isNotFound = isNotFound;
  }
}

/**
 * Request OTP from revv-backend /api/v1/auth/request-otp
 */
export async function requestOtp(identifier: string): Promise<{
  success: boolean;
  message: string;
  otpEcho?: string;
  expiresAt?: string;
}> {
  const cleanId = identifier.trim();
  if (!cleanId) {
    throw new AuthApiError("Please enter your email, username, or phone number.", 400);
  }

  const baseUrl = getApiBaseUrl();
  const payload: Record<string, string> = {};

  if (cleanId.includes("@")) {
    payload.email = cleanId;
  } else if (/^\+?\d{10,}$/.test(cleanId.replace(/[\s-]/g, ""))) {
    payload.phone = cleanId.replace(/[\s-]/g, "");
  } else {
    payload.identifier = cleanId;
  }

  try {
    const res = await fetch(`${baseUrl}/auth/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (res.status === 404) {
      throw new AuthApiError(
        "Rider account not found. Apply for Closed Beta access or create your rider account on the REVV mobile app.",
        404,
        true,
      );
    }

    if (res.status === 429) {
      throw new AuthApiError(
        "Too many OTP requests. Please wait a few minutes before trying again.",
        429,
      );
    }

    if (!res.ok) {
      if (res.status === 503) {
        return {
          success: true,
          message: "Development mode: SMS/Email service is in local test mode.",
          otpEcho: body?.data?.otp ?? "123456",
        };
      }
      const msg = body?.meta?.message || body?.message || "Failed to request OTP code.";
      throw new AuthApiError(msg, res.status);
    }

    const otpEcho = body?.data?.otp;
    const expiresAt = body?.data?.expires_at;

    return {
      success: true,
      message: body?.meta?.message || "Verification code sent.",
      otpEcho,
      expiresAt,
    };
  } catch (err) {
    if (err instanceof AuthApiError) throw err;
    console.warn("REVV Backend unreachable during requestOtp:", err);
    throw new AuthApiError(
      "Unable to reach the REVV authentication service. Please check your internet connection or try again later.",
      503,
    );
  }
}

/**
 * Sign in with OTP via revv-backend /api/v1/auth/sign-in
 */
export async function signInWithOtp(
  identifier: string,
  otp: string,
): Promise<{
  tokens: AuthTokens;
  identifier: string;
}> {
  const cleanId = identifier.trim();
  const cleanOtp = otp.trim();

  if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new AuthApiError("Please enter a valid 6-digit verification code.", 400);
  }

  const baseUrl = getApiBaseUrl();
  const payload: Record<string, string> = { otp: cleanOtp };

  if (cleanId.includes("@")) {
    payload.email = cleanId;
  } else if (/^\+?\d{10,}$/.test(cleanId.replace(/[\s-]/g, ""))) {
    payload.phone = cleanId.replace(/[\s-]/g, "");
  } else {
    payload.identifier = cleanId;
  }

  try {
    const res = await fetch(`${baseUrl}/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (res.status === 404) {
      throw new AuthApiError(
        "Rider account not found. Apply for Closed Beta access or register via the REVV mobile app.",
        404,
        true,
      );
    }

    if (res.status === 401) {
      throw new AuthApiError(
        "Invalid or expired verification code. Please check and try again.",
        401,
      );
    }

    if (!res.ok) {
      const msg = body?.meta?.message || body?.message || "Sign in failed.";
      throw new AuthApiError(msg, res.status);
    }

    const rawTokens: any = body?.data ?? body;
    let accessToken = "";
    let refreshToken = "";
    if (Array.isArray(rawTokens)) {
      accessToken = rawTokens[0] || "";
      refreshToken = rawTokens[1] || "";
    } else if (rawTokens && typeof rawTokens === "object") {
      accessToken = rawTokens.access_token || rawTokens.accessToken || "";
      refreshToken = rawTokens.refresh_token || rawTokens.refreshToken || "";
    }

    const tokens: AuthTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900,
    };

    if (typeof window !== "undefined" && tokens.access_token) {
      localStorage.setItem("revv_access_token", tokens.access_token);
      localStorage.setItem("revv_refresh_token", tokens.refresh_token || "");
      localStorage.setItem("revv_rider_id", cleanId);
    }

    return { tokens, identifier: cleanId };
  } catch (err) {
    if (err instanceof AuthApiError) throw err;
    console.warn("REVV Backend unreachable during signInWithOtp:", err);
    throw new AuthApiError(
      "Unable to verify code with REVV server. Please check your connection.",
      503,
    );
  }
}

/**
 * Rider session storage helpers
 */
export function getSavedSession(): {
  token: string | null;
  refreshToken: string | null;
  riderId: string | null;
  username: string | null;
} {
  if (typeof window === "undefined") {
    return { token: null, refreshToken: null, riderId: null, username: null };
  }
  const token = localStorage.getItem("revv_access_token");
  const refreshToken = localStorage.getItem("revv_refresh_token");
  const username = localStorage.getItem("revv_username");
  const riderId = localStorage.getItem("revv_rider_id") || username;

  const cleanToken = token && token !== "undefined" && token !== "null" ? token : null;
  const cleanRefresh =
    refreshToken && refreshToken !== "undefined" && refreshToken !== "null" ? refreshToken : null;
  const cleanUsername =
    username && username !== "undefined" && username !== "null" ? username : null;
  const cleanRiderId =
    riderId && riderId !== "undefined" && riderId !== "null" ? riderId : cleanUsername;

  return {
    token: cleanToken,
    refreshToken: cleanRefresh,
    riderId: cleanRiderId,
    username: cleanUsername,
  };
}

export function saveAuthSession(
  tokensOrAccessToken:
    | string
    | {
        access_token?: string;
        token?: string;
        refresh_token?: string | null;
        riderId?: string | null;
        username?: string | null;
      },
  refreshToken?: string | null,
  riderId?: string | null,
): void {
  if (typeof window === "undefined") return;
  let access: string | undefined;
  let refresh: string | null | undefined;
  let rider: string | null | undefined;
  let user: string | null | undefined;

  if (typeof tokensOrAccessToken === "object" && tokensOrAccessToken !== null) {
    access = tokensOrAccessToken.access_token || tokensOrAccessToken.token;
    refresh = tokensOrAccessToken.refresh_token;
    rider = tokensOrAccessToken.riderId;
    user = tokensOrAccessToken.username || tokensOrAccessToken.riderId;
  } else {
    access = tokensOrAccessToken;
    refresh = refreshToken;
    rider = riderId;
    user = riderId;
  }

  if (access) localStorage.setItem("revv_access_token", access);
  if (refresh) localStorage.setItem("revv_refresh_token", refresh);
  if (rider) localStorage.setItem("revv_rider_id", rider);
  if (user) localStorage.setItem("revv_username", user);
}

export function clearSavedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("revv_access_token");
  localStorage.removeItem("revv_refresh_token");
  localStorage.removeItem("revv_rider_id");
  localStorage.removeItem("revv_username");
}

export function checkUrlForAuthTokens(): {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
} {
  if (typeof window === "undefined") {
    return { token: null, refreshToken: null, username: null };
  }
  const params = new URLSearchParams(window.location.search);
  const token = params.get("access_token") || params.get("token");
  const refreshToken = params.get("refresh_token");
  const username = params.get("username") || params.get("rider_id");

  if (token) {
    saveAuthSession(token, refreshToken, username);
    params.delete("access_token");
    params.delete("token");
    params.delete("refresh_token");
    params.delete("username");
    params.delete("rider_id");
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
    return { token, refreshToken, username };
  }
  return { token: null, refreshToken: null, username: null };
}

async function tryRefreshSession(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const session = getSavedSession();
  const refreshToken = session.refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearSavedSession();
      return null;
    }
    const body = await res.json().catch(() => null);
    const rawTokens: any = body?.data ?? body;
    let accessToken = "";
    let refreshTokenNew = "";
    if (Array.isArray(rawTokens)) {
      accessToken = rawTokens[0] || "";
      refreshTokenNew = rawTokens[1] || "";
    } else if (rawTokens && typeof rawTokens === "object") {
      accessToken = rawTokens.access_token || rawTokens.accessToken || "";
      refreshTokenNew = rawTokens.refresh_token || rawTokens.refreshToken || "";
    }

    if (accessToken) {
      localStorage.setItem("revv_access_token", accessToken);
      if (refreshTokenNew) {
        localStorage.setItem("revv_refresh_token", refreshTokenNew);
      }
      return accessToken;
    }
  } catch {
    // ignore refresh network errors
  }
  return null;
}

/**
 * Authenticated request helper with automatic 401 refresh retry
 */
export async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const session = getSavedSession();
  let token = session.token;
  if (!token) {
    throw new AuthApiError("Not signed in.", 401);
  }

  const doFetch = async (bearer: string) => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${bearer}`,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  };

  let res = await doFetch(token);
  if (res.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      token = refreshed;
      res = await doFetch(token);
    } else {
      clearSavedSession();
      throw new AuthApiError("Your session has expired. Please sign in again.", 401);
    }
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.meta?.message || body?.message || `Request failed (${res.status})`;
    throw new AuthApiError(msg, res.status);
  }

  return body?.data as T;
}

/**
 * Submit Closed Beta Pre-Registration (`POST /api/v1/registrations`)
 */
export async function submitBetaRegistration(
  payload: BetaRegistrationPayload,
): Promise<{ id: string; status: string; created_at: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      body?.meta?.message || body?.message || "Unable to submit beta registration right now.";
    throw new AuthApiError(msg, res.status);
  }
  return body?.data;
}

/**
 * Public master motorcycle catalog (`GET /api/v1/master/motorcycles`)
 */
export async function fetchMasterMotorcycles(): Promise<MasterMotorcycleItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/master/motorcycles`, {
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

export interface PublicProfileGarageItem {
  id: string;
  brand_name: string;
  series_name: string;
  nickname: string | null;
  category: string | null;
  transmission: string | null;
  image_path: string | null;
  plate_number: string | null;
  manufacture_year: number | null;
  engine_capacity_cc: number | null;
  current_mileage: number;
  is_primary: boolean;
}

export interface PublicProfileResponse {
  id: string;
  username: string;
  noreg: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  job: string | null;
  account_visibility: "PUBLIC" | "PRIVATE";
  is_friend: boolean;
  has_pending_request: boolean;
  is_private: boolean;
  motorcycle_count: number | null;
  garage: PublicProfileGarageItem[] | null;
  posts: FeedPostItem[] | null;
}

export interface FriendUserItem {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  city?: string | null;
  job?: string | null;
  connected_since: string;
}

export interface FriendRequestItem {
  id: string;
  user_id: string;
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  is_outgoing: boolean;
  created_at: string;
}

export interface SocialRiderSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  city?: string | null;
  friendship_status: "friends" | "outgoing_request" | "incoming_request" | "none";
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
  return authRequest<SocialRiderSearchResult[]>(`/friends/search?q=${encodeURIComponent(clean)}`);
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
      const res = await authRequest<any>(`/users/${encodeURIComponent(clean)}/profile`);
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
        return {
          id: myProf.id,
          username: myProf.username || "rider",
          noreg: myProf.noreg || null,
          first_name: myProf.first_name || null,
          middle_name: myProf.middle_name || null,
          last_name: myProf.last_name || null,
          avatar_url: myProf.avatar_url || null,
          banner_url: myProf.banner_url || null,
          bio: myProf.bio || null,
          city: myProf.city || null,
          job: myProf.job || null,
          account_visibility: myProf.account_visibility || "PUBLIC",
          is_friend: true,
          has_pending_request: false,
          is_private: false,
          motorcycle_count: null,
          garage: null,
          posts: null,
        };
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
  job?: string;
  avatar_url?: string;
  banner_url?: string;
  account_visibility?: string;
}): Promise<RiderProfile> {
  return authRequest<RiderProfile>("/me", {
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

export async function compressImageFile(
  file: File,
  maxDimension = 2048,
  quality = 0.82,
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
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
}): Promise<FeedPostItem> {
  return authRequest<FeedPostItem>("/feed/status", {
    method: "POST",
    body: JSON.stringify(payload),
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
  payload: { role?: string; status?: string },
): Promise<AdminUserItem> {
  return authRequest<AdminUserItem>(`/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
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

export async function fetchBetaRegistrations(status?: string): Promise<BetaRegistrationRow[]> {
  const qs = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
  return authRequest<BetaRegistrationRow[]>(`/admin/registrations${qs}`);
}

export async function updateBetaRegistration(
  id: string,
  payload: { status?: string; admin_notes?: string },
): Promise<BetaRegistrationRow> {
  return authRequest<BetaRegistrationRow>(`/admin/registrations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBetaRegistration(id: string): Promise<void> {
  await authRequest<unknown>(`/admin/registrations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
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
    method: "PUT",
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

export async function deleteAdminComponent(id: number): Promise<void> {
  await authRequest<unknown>(`/admin/master/components/${id}`, {
    method: "DELETE",
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
  payload?: Record<string, any> | null;
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
  hasPurpose?: boolean;
  purposeTitle?: string;
  purposeMessage?: string;
  isDestroySession?: boolean;
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
            hasPurpose: Boolean(body.data.hasPurpose),
            purposeTitle: body.data.purposeTitle || "",
            purposeMessage: body.data.purposeMessage || "",
            isDestroySession: Boolean(body.data.isDestroySession),
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
      hasPurpose: Boolean(data.hasPurpose),
      purposeTitle: data.purposeTitle || "",
      purposeMessage: data.purposeMessage || "",
      isDestroySession: Boolean(data.isDestroySession),
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
  hasPurpose: boolean;
  purposeTitle: string;
  purposeMessage: string;
  isDestroySession: boolean;
  updated_by?: string | null;
  updated_at?: string;
}

export type AdminSystemStatusRecord = SystemStatusConfig;

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
  hasPurpose?: boolean;
  purposeTitle?: string;
  purposeMessage?: string;
  isDestroySession?: boolean;
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
  const baseUrl = getApiBaseUrl();
  const { token } = getSavedSession();
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 20),
  });
  if (params?.status && params.status !== "ALL") {
    q.set("status", params.status);
  }
  const res = await fetch(`${baseUrl}/admin/support/tickets?${q.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<SupportTicketItem[]> | null;
  if (!res.ok || !body) {
    throw new AuthApiError(body?.meta?.message || "Failed to load support tickets", res.status);
  }
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

async function renderCanvasBlob(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<{ blob: Blob; mime: string; ext: string }> {
  const ratio = Math.min(1, maxDimension / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * ratio));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const tryEncode = (mime: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), mime, q));

  const webp = await tryEncode("image/webp", quality);
  if (webp && webp.type === "image/webp" && webp.size > 0) {
    return { blob: webp, mime: "image/webp", ext: "webp" };
  }
  const jpeg = await tryEncode("image/jpeg", quality);
  if (jpeg && jpeg.size > 0) {
    return { blob: jpeg, mime: "image/jpeg", ext: "jpg" };
  }
  throw new Error("Failed to compress image");
}

export async function uploadCompressedMedia(file: File): Promise<{
  url: string;
  thumbnail_url: string;
  size: number;
}> {
  const { token } = getSavedSession();
  if (!token) {
    throw new AuthApiError("Sign in as Administrator before uploading media", 401);
  }

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

    const res = await fetch(`${getApiBaseUrl()}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = (await res.json().catch(() => null)) as ApiResponse<{
      url: string;
      thumbnail_url: string;
      size: number;
    }> | null;

    if (!res.ok || !body?.data?.url) {
      throw new AuthApiError(body?.meta?.message || "Media upload failed", res.status);
    }
    return body.data;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "blockquote",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "figure",
  "img",
  "figcaption",
  "a",
  "div",
]);

export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return rawHtml
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const cleanNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object") {
            el.remove();
            continue;
          }
          const frag = doc.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          cleanNode(frag);
          el.replaceWith(frag);
          continue;
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim();
          const keepHref = tag === "a" && name === "href" && /^https?:\/\//i.test(val);
          const keepSrc =
            tag === "img" &&
            name === "src" &&
            (/^https?:\/\//i.test(val) || val.startsWith("/uploads/"));
          const keepAlt = tag === "img" && name === "alt";
          if (!keepHref && !keepSrc && !keepAlt) {
            el.removeAttribute(attr.name);
          }
        }
        if (tag === "a") {
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
        if (tag === "img") {
          el.setAttribute("loading", "lazy");
        }
        cleanNode(el);
      }
    }
  };

  cleanNode(root);
  return root.innerHTML;
}
