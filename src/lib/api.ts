/**
 * REVV- Web API Client
 * Connects to REVV Backend services (News, Auth/OTP, Profile)
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
  if (typeof window !== "undefined" && (window as any).__REVV_API_URL__) {
    return (window as any).__REVV_API_URL__;
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // If in browser on production domain revv.asteralabs.digital
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("asteralabs.digital") || host.includes("vercel.app")) {
      return "https://revv.asteralabs.digital/api/v1";
    }
  }

  return "http://localhost:8000/api/v1";
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

  // Fallback to seed articles if backend is offline or has no articles
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
 * Custom error for login operations
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
 *
 * Rules:
 * - Registration is NOT allowed on web.
 * - If user does not exist (404), throw an explicit "User not found" error explaining
 *   that registration must be done via the REVV mobile app.
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
        "Rider account not found. Web registration is not supported. Please download the REVV mobile app to create your rider account.",
        404,
        true,
      );
    }

    if (res.status === 429) {
      throw new AuthApiError("Too many OTP requests. Please wait a few minutes before trying again.", 429);
    }

    if (!res.ok) {
      // In local development or staging, if SMS/Email is not configured (503)
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
    // If backend is completely offline or unreachable
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
        "Rider account not found. Registration is exclusively available on the REVV mobile app.",
        404,
        true,
      );
    }

    if (res.status === 401) {
      throw new AuthApiError("Invalid or expired verification code. Please check and try again.", 401);
    }

    if (!res.ok) {
      const msg = body?.meta?.message || body?.message || "Sign in failed.";
      throw new AuthApiError(msg, res.status);
    }

    const tokens: AuthTokens = body?.data;
    if (typeof window !== "undefined" && tokens?.access_token) {
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
export function getSavedSession(): { token: string | null; riderId: string | null } {
  if (typeof window === "undefined") return { token: null, riderId: null };
  return {
    token: localStorage.getItem("revv_access_token"),
    riderId: localStorage.getItem("revv_rider_id"),
  };
}

export function clearSavedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("revv_access_token");
  localStorage.removeItem("revv_refresh_token");
  localStorage.removeItem("revv_rider_id");
}
