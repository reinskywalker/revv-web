import type { ApiResponse, AuthTokens } from "./api-types";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.revv.revv_frontend";
export const APP_STORE_URL = "https://apps.apple.com/search?term=REVV";

export function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env["VITE_API_BASE_URL"];
  if (envUrl && envUrl.trim().length > 0) {
    return normalizeApiBaseUrl(envUrl);
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000/api/v1";
    }
    return "https://revv.asteralabs.digital/api/v1";
  }

  // On SSR in production/preview (Vercel / NODE_ENV=production), default to production API
  const isProd =
    import.meta.env.PROD ||
    (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production");
  return isProd ? "https://revv.asteralabs.digital/api/v1" : "http://localhost:8000/api/v1";
}

const SAFE_RASTER_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    SAFE_RASTER_DATA_IMAGE_RE.test(trimmed)
  ) {
    return trimmed;
  }
  if (
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("javascript:")
  ) {
    return null;
  }
  const origin = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
  const clean = trimmed.replace(/^\/+/, "");
  const normalized = clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  return `${origin}${normalized}`;
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
    payload["email"] = cleanId;
  } else if (/^\+?\d{10,}$/.test(cleanId.replace(/[\s-]/g, ""))) {
    payload["phone"] = cleanId.replace(/[\s-]/g, "");
  } else {
    payload["identifier"] = cleanId;
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
      const msg =
        body?.meta?.message ||
        body?.message ||
        (res.status === 503
          ? "Verification service is temporarily unavailable. Please try again shortly."
          : "Failed to request OTP code.");
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

function extractTokenPair(rawTokens: unknown): { accessToken: string; refreshToken: string } {
  if (Array.isArray(rawTokens)) {
    return {
      accessToken: typeof rawTokens[0] === "string" ? rawTokens[0] : "",
      refreshToken: typeof rawTokens[1] === "string" ? rawTokens[1] : "",
    };
  }
  if (rawTokens && typeof rawTokens === "object") {
    const obj = rawTokens as Record<string, unknown>;
    return {
      accessToken:
        (typeof obj["access_token"] === "string" ? obj["access_token"] : undefined) ??
        (typeof obj["accessToken"] === "string" ? obj["accessToken"] : undefined) ??
        "",
      refreshToken:
        (typeof obj["refresh_token"] === "string" ? obj["refresh_token"] : undefined) ??
        (typeof obj["refreshToken"] === "string" ? obj["refreshToken"] : undefined) ??
        "",
    };
  }
  return { accessToken: "", refreshToken: "" };
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
    payload["email"] = cleanId;
  } else if (/^\+?\d{10,}$/.test(cleanId.replace(/[\s-]/g, ""))) {
    payload["phone"] = cleanId.replace(/[\s-]/g, "");
  } else {
    payload["identifier"] = cleanId;
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

    const { accessToken, refreshToken } = extractTokenPair(body?.data ?? body);

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

let refreshInFlight: Promise<string | null> | null = null;

async function performRefreshSession(): Promise<string | null> {
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
    const { accessToken, refreshToken: refreshTokenNew } = extractTokenPair(body?.data ?? body);

    if (accessToken) {
      lastRefreshRejected = false;
      localStorage.setItem("revv_access_token", accessToken);
      if (refreshTokenNew) {
        localStorage.setItem("revv_refresh_token", refreshTokenNew);
      }
      return accessToken;
    }
    if (res.status === 401 || res.status === 403) {
      lastRefreshRejected = true;
    }
  } catch {
    lastRefreshRejected = false;
  }
  return null;
}

let lastRefreshRejected = false;

export async function tryRefreshSession(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  lastRefreshRejected = false;
  refreshInFlight = performRefreshSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function logoutSession(): Promise<void> {
  const session = getSavedSession();
  const refreshToken = session.refreshToken;
  const accessToken = session.token;
  clearSavedSession();
  if (typeof window === "undefined" || (!refreshToken && !accessToken)) {
    return;
  }
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
  } catch {
    // Best-effort revocation; local tokens are already cleared.
  }
}

/**
 * Authenticated request helper returning full envelope with single-flight 401 refresh retry
 */
export async function authRequestRaw<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
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
      if (lastRefreshRejected) {
        clearSavedSession();
      }
      throw new AuthApiError("Your session has expired. Please sign in again.", 401);
    }
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok) {
    const msg =
      body?.meta?.message ||
      (body as { message?: string } | null)?.message ||
      `Request failed (${res.status})`;
    throw new AuthApiError(msg, res.status);
  }

  return (body ?? {
    meta: { status: "success", message: "" },
    data: undefined as T,
  }) as ApiResponse<T>;
}

/**
 * Authenticated request helper with automatic 401 refresh retry
 */
export async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const body = await authRequestRaw<T>(path, options);
  return body.data as T;
}

/**
 * Request helper that sends auth headers if a session exists, otherwise falls
 * back cleanly to an unauthenticated request (including SSR).
 */
export async function optionalAuthRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof window !== "undefined" && getSavedSession().token) {
    try {
      return await authRequest<T>(path, options);
    } catch (err) {
      // If refresh failed & session was cleared on a public GET, retry anonymously once
      if (!getSavedSession().token && (!options.method || options.method.toUpperCase() === "GET")) {
        // fall through to public fetch
      } else {
        throw err;
      }
    }
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthApiError(
      body?.meta?.message || body?.message || `HTTP ${res.status}`,
      res.status,
      res.status === 404,
    );
  }
  return (body?.data ?? body) as T;
}
