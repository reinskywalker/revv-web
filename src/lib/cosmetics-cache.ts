/**
 * Cosmetics Catalog & Immutable Lottie Asset Cache (Web)
 *
 * - Uses ETag / If-None-Match (304 Not Modified) for `/cosmetics/catalog` so returning
 *   riders never re-download unchanged catalog metadata.
 * - Uses browser CacheStorage (`revv-lottie-v1`) + in-memory Map keyed by SHA-256 `asset_hash`
 *   so each Lottie animation JSON is downloaded at most ONCE across sessions.
 * - Deduplicates concurrent fetches across all mounted `<RevvAvatar />` & `<RevvBadge />` nodes.
 */
import { useEffect, useState } from "react";
import { getApiBaseUrl, getSavedSession } from "./api";

export interface CosmeticFrameItem {
  code: string;
  title: string;
  description: string;
  asset_key: string;
  category: string;
  source_type: string;
  condition_type: string;
  condition_target_code?: string | null;
  event_id?: string | null;
  min_tier_code?: string | null;
  required_consecutive_months: number;
  price_idr?: number | null;
  price_usd_cents?: number | null;
  effective_currency: string;
  effective_amount: number;
  is_verified_badge: boolean;
  is_animated: boolean;
  asset_hash?: string | null;
  lottie_url?: string | null;
  unlocked: boolean;
  equipped: boolean;
  granted_reason?: string | null;
  acquired_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CosmeticBadgeItem {
  code: string;
  title: string;
  description: string;
  category: string;
  source_type: string;
  condition_type: string;
  condition_target_code?: string | null;
  event_id?: string | null;
  price_idr?: number | null;
  price_usd_cents?: number | null;
  effective_currency: string;
  effective_amount: number;
  is_animated: boolean;
  asset_hash?: string | null;
  lottie_url?: string | null;
  unlocked: boolean;
  equipped: boolean;
  granted_reason?: string | null;
  acquired_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CosmeticsCatalogResponse {
  catalog_etag: string;
  pricing_region: string;
  currency: string;
  phone_verification_required_for_regional_pricing: boolean;
  verified_country_code?: string | null;
  equipped_frame_code?: string | null;
  frames: CosmeticFrameItem[];
  badges: CosmeticBadgeItem[];
}

const STORAGE_CATALOG_KEY = "revv_cosmetics_catalog_v1";
const STORAGE_ETAG_KEY = "revv_cosmetics_etag_v1";
const LOTTIE_CACHE_NAME = "revv-lottie-v1";

let memoryCatalog: CosmeticsCatalogResponse | null = null;
let memoryCatalogFetchedAt = 0;
let inflightCatalogPromise: Promise<CosmeticsCatalogResponse | null> | null = null;

const memoryLottieMap = new Map<string, Record<string, unknown>>();
const inflightLottieMap = new Map<string, Promise<Record<string, unknown> | null>>();

function readStoredCatalog(): { catalog: CosmeticsCatalogResponse | null; etag: string | null } {
  if (typeof window === "undefined") return { catalog: null, etag: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_CATALOG_KEY);
    const etag = window.localStorage.getItem(STORAGE_ETAG_KEY);
    if (!raw) return { catalog: null, etag };
    return { catalog: JSON.parse(raw) as CosmeticsCatalogResponse, etag };
  } catch {
    return { catalog: null, etag: null };
  }
}

function writeStoredCatalog(catalog: CosmeticsCatalogResponse, etag: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(catalog));
    if (etag) {
      window.localStorage.setItem(STORAGE_ETAG_KEY, etag);
    }
  } catch {
    // ignore storage quota errors
  }
}

export function clearCosmeticsMemoryCache(): void {
  memoryCatalog = null;
  memoryCatalogFetchedAt = 0;
  inflightCatalogPromise = null;
  memoryLottieMap.clear();
  inflightLottieMap.clear();
}

export async function fetchCosmeticsCatalogCached(
  forceRefresh = false,
): Promise<CosmeticsCatalogResponse | null> {
  const now = Date.now();
  if (!forceRefresh && memoryCatalog && now - memoryCatalogFetchedAt < 60_000) {
    return memoryCatalog;
  }
  if (!forceRefresh && inflightCatalogPromise) {
    return inflightCatalogPromise;
  }

  inflightCatalogPromise = (async () => {
    const stored = readStoredCatalog();
    const baseUrl = getApiBaseUrl();
    const session = getSavedSession();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    if (!forceRefresh && stored.etag && stored.catalog) {
      headers["If-None-Match"] = stored.etag;
    }

    try {
      const res = await fetch(`${baseUrl}/cosmetics/catalog`, { headers });
      if (res.status === 304 && stored.catalog) {
        memoryCatalog = stored.catalog;
        memoryCatalogFetchedAt = Date.now();
        return stored.catalog;
      }
      if (!res.ok) {
        return stored.catalog ?? memoryCatalog;
      }
      const json = (await res.json()) as { data?: CosmeticsCatalogResponse };
      const catalog = json.data ?? null;
      if (catalog) {
        const etag = res.headers.get("ETag") || catalog.catalog_etag || null;
        memoryCatalog = catalog;
        memoryCatalogFetchedAt = Date.now();
        writeStoredCatalog(catalog, etag);
      }
      return catalog;
    } catch {
      return stored.catalog ?? memoryCatalog;
    } finally {
      inflightCatalogPromise = null;
    }
  })();

  return inflightCatalogPromise;
}

export async function fetchLottieByHashCached(
  assetHash: string,
  lottieUrl?: string | null,
): Promise<Record<string, unknown> | null> {
  const hash = assetHash.trim().toLowerCase();
  if (!hash) return null;

  const memHit = memoryLottieMap.get(hash);
  if (memHit) return memHit;

  const existingPromise = inflightLottieMap.get(hash);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    const baseOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
    const targetUrl = lottieUrl
      ? lottieUrl.startsWith("http")
        ? lottieUrl
        : `${baseOrigin}${lottieUrl}`
      : `${getApiBaseUrl()}/cosmetics/lottie/${encodeURIComponent(hash)}`;

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await window.caches.open(LOTTIE_CACHE_NAME);
        const cachedResp = await cache.match(targetUrl);
        if (cachedResp) {
          const parsed = (await cachedResp.json()) as Record<string, unknown>;
          memoryLottieMap.set(hash, parsed);
          return parsed;
        }
      } catch {
        // CacheStorage may be disabled in private browsing
      }
    }

    try {
      const resp = await fetch(targetUrl, { headers: { Accept: "application/json" } });
      if (!resp.ok) return null;
      const cloned = resp.clone();
      const parsed = (await resp.json()) as Record<string, unknown>;
      memoryLottieMap.set(hash, parsed);
      if (typeof window !== "undefined" && "caches" in window) {
        window.caches
          .open(LOTTIE_CACHE_NAME)
          .then((cache) => cache.put(targetUrl, cloned))
          .catch(() => {});
      }
      return parsed;
    } catch {
      return null;
    } finally {
      inflightLottieMap.delete(hash);
    }
  })();

  inflightLottieMap.set(hash, promise);
  return promise;
}

export function useCosmeticsCatalog(): CosmeticsCatalogResponse | null {
  const [catalog, setCatalog] = useState<CosmeticsCatalogResponse | null>(() => {
    return memoryCatalog ?? readStoredCatalog().catalog;
  });

  useEffect(() => {
    let active = true;
    void fetchCosmeticsCatalogCached().then((data) => {
      if (active && data) {
        setCatalog(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return catalog;
}

export function useLottieAsset(
  assetHash?: string | null,
  lottieUrl?: string | null,
): Record<string, unknown> | null {
  const [data, setData] = useState<Record<string, unknown> | null>(() => {
    const key = assetHash?.trim().toLowerCase();
    return key ? (memoryLottieMap.get(key) ?? null) : null;
  });

  useEffect(() => {
    const key = assetHash?.trim().toLowerCase();
    if (!key) {
      setData(null);
      return;
    }
    const mem = memoryLottieMap.get(key);
    if (mem) {
      setData(mem);
      return;
    }
    let active = true;
    void fetchLottieByHashCached(key, lottieUrl).then((loaded) => {
      if (active) setData(loaded);
    });
    return () => {
      active = false;
    };
  }, [assetHash, lottieUrl]);

  return data;
}
