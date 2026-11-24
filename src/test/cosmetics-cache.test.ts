import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCosmeticsMemoryCache,
  fetchCosmeticsCatalogCached,
  fetchLottieByHashCached,
} from "@/lib/cosmetics-cache";

describe("cosmetics-cache (ETag/304 & SHA-256 Lottie Cache)", () => {
  beforeEach(() => {
    clearCosmeticsMemoryCache();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("revalidates catalog with If-None-Match and reuses cached response on HTTP 304", async () => {
    const sampleCatalog = {
      catalog_etag: '"etag-abc123"',
      pricing_region: "ID",
      currency: "IDR",
      phone_verification_required_for_regional_pricing: false,
      verified_country_code: null,
      equipped_frame_code: "beta_pioneer",
      frames: [
        {
          code: "beta_pioneer",
          title: "Closed Beta Pioneer",
          description: "Free beta frame",
          asset_key: "frame_beta_pioneer",
          category: "beta",
          source_type: "beta_reward",
          condition_type: "beta_tester",
          condition_target_code: null,
          event_id: null,
          min_tier_code: null,
          required_consecutive_months: 0,
          price_idr: 0,
          price_usd_cents: 0,
          effective_currency: "IDR",
          effective_amount: 0,
          is_verified_badge: false,
          is_animated: true,
          asset_hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
          lottie_url: "/api/v1/cosmetics/lottie/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
          unlocked: true,
          equipped: true,
          granted_reason: "beta_tester",
          acquired_at: null,
          expires_at: null,
          metadata: {},
        },
      ],
      badges: [],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers({ ETag: '"etag-abc123"' }),
        json: async () => ({ data: sampleCatalog }),
      })
      .mockResolvedValueOnce({
        status: 304,
        ok: false,
        headers: new Headers({ ETag: '"etag-abc123"' }),
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchCosmeticsCatalogCached(true);
    expect(first?.frames).toHaveLength(1);
    expect(first?.frames[0]?.code).toBe("beta_pioneer");

    clearCosmeticsMemoryCache();
    const second = await fetchCosmeticsCatalogCached(false);
    expect(second?.frames).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(secondHeaders["If-None-Match"]).toBe('"etag-abc123"');
  });

  it("deduplicates and caches DB Lottie JSON payloads by SHA-256 hash", async () => {
    const lottieJson = { v: "5.7.4", fr: 30, ip: 0, op: 60, w: 200, h: 200, layers: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => lottieJson }),
      json: async () => lottieJson,
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = "/api/v1/cosmetics/lottie/0123456789abcdef0123456789abcdef";
    const first = await fetchLottieByHashCached("0123456789abcdef0123456789abcdef", url);
    const second = await fetchLottieByHashCached("0123456789abcdef0123456789abcdef", url);
    expect(first).toEqual(lottieJson);
    expect(second).toEqual(lottieJson);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
