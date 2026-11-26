import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppOpenBanner } from "@/components/revv/AppOpenBanner";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import {
  clearSavedSession,
  fetchPublicUserAchievements,
  resolveMediaUrl,
  sanitizeRichHtml,
  saveAuthSession,
} from "@/lib/api";
import * as apiBilling from "@/lib/api-billing";
import { formatDuration } from "@/lib/date";
import { formatRiderFullName, getErrorMessage, isAdminRole } from "@/lib/utils";
import {
  clearCosmeticsMemoryCache,
  fetchCosmeticsCatalogCached,
  invalidateCosmeticsCatalogCache,
} from "@/lib/cosmetics-cache";
import { ThemeProvider, useTheme } from "@/lib/theme-context";

function ThemeProbe() {
  const { mode, resolvedTheme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {`${mode}:${resolvedTheme}`}
    </button>
  );
}

describe("Web Overhaul: AppOpenBanner, ThemeProvider, RevvAvatar & Country Currency Invalidation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    invalidateCosmeticsCatalogCache();
    clearSavedSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hides AppOpenBanner on desktop and renders dismissibly on mobile viewports", () => {
    const desktopMql = {
      matches: false,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
    const matchMediaSpy = vi
      .spyOn(window, "matchMedia")
      .mockReturnValue(desktopMql as unknown as MediaQueryList);
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1280 });

    const { container, unmount } = render(<AppOpenBanner deepLinkPath="/clubs/demo" />);
    expect(container.firstChild).toBeNull();
    unmount();

    matchMediaSpy.mockReturnValue({
      ...desktopMql,
      matches: true,
    } as unknown as MediaQueryList);
    Object.defineProperty(window, "innerWidth", { writable: true, value: 390 });

    render(<AppOpenBanner deepLinkPath="/clubs/demo" title="Open Club in REVV" />);
    expect(screen.getByText("Open Club in REVV")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));
    expect(screen.queryByText("Open Club in REVV")).toBeNull();
    expect(window.sessionStorage.getItem("revv_mobile_app_banner_dismissed")).toBe("1");
  });

  it("switches .dark / .light root classes via ThemeProvider and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("dark:dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(btn);
    expect(btn.textContent).toBe("light:light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("revv_web_theme")).toBe("light");
  });

  it("renders squircle RevvAvatar and PNG frame rim without overlaying VerifiedCheckBadge on the avatar", () => {
    const { container } = render(
      <RevvAvatar name="Reinsky" frameCode="verified_patron" size={64} showVerifiedBadge={true} />,
    );

    const squirclePhoto = container.querySelector(".rounded-\\[19\\%\\]");
    expect(squirclePhoto).not.toBeNull();

    const frameImg = container.querySelector('img[src="/frames/frame_verified_patron.png"]');
    expect(frameImg).not.toBeNull();

    expect(screen.queryByAltText("Verified REVV Member")).toBeNull();
  });

  it("sends Bearer token on cosmetics catalog fetch and purges localStorage keys on country invalidation", async () => {
    saveAuthSession({ access_token: "test-jwt-123" });
    clearCosmeticsMemoryCache();

    const catalogId = {
      catalog_etag: '"etag-idr"',
      pricing_region: "ID",
      currency: "IDR",
      phone_verification_required_for_regional_pricing: false,
      verified_country_code: "ID",
      equipped_frame_code: null,
      frames: [],
      badges: [],
    };
    const catalogGlobal = {
      ...catalogId,
      catalog_etag: '"etag-usd"',
      pricing_region: "GLOBAL",
      currency: "USD",
      verified_country_code: "US",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"etag-idr"' }),
        json: async () => ({ data: catalogId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"etag-usd"' }),
        json: async () => ({ data: catalogGlobal }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchCosmeticsCatalogCached(true);
    expect(first?.currency).toBe("IDR");
    const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(firstHeaders["Authorization"]).toBe("Bearer test-jwt-123");
    expect(window.localStorage.getItem("revv_cosmetics_etag_v2")).toBe('"etag-idr"');

    // Simulate country change invalidating localStorage + memory cache
    invalidateCosmeticsCatalogCache();
    expect(window.localStorage.getItem("revv_cosmetics_catalog_v2")).toBeNull();
    expect(window.localStorage.getItem("revv_cosmetics_etag_v2")).toBeNull();

    const second = await fetchCosmeticsCatalogCached(true);
    expect(second?.currency).toBe("USD");
    const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(secondHeaders["If-None-Match"]).toBeUndefined();
  });

  it("normalizes Rust backend AchievementsPayload (summary.pinned_codes & achievements[]) without crashing", async () => {
    const backendPayload = {
      data: {
        summary: {
          total_achieved: 2,
          total_categories: 10,
          badges_unlocked: 3,
          total_badge_tiers: 25,
          milestones_achieved: 1,
          total_milestones: 5,
          total_xp: 450,
          rank_title: "Tourer",
          pinned_codes: ["special_founding_rider"],
        },
        achievements: [
          {
            code: "special_founding_rider",
            title: "Founding Throttle",
            description: "Closed beta rider.",
            category: "special",
            kind: "badge",
            has_badge: true,
            icon_key: "founding_throttle",
            unit_label: "",
            highest_level: 1,
            max_level: 1,
            current_value: 1,
            next_threshold: null,
            tiers: [
              {
                level: 1,
                name: "Founder",
                threshold: 1,
                xp: 250,
                unlocked: true,
                unlocked_at: "2026-01-01T00:00:00Z",
              },
            ],
          },
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => backendPayload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = await fetchPublicUserAchievements("reinskywalker");
    expect(parsed.summary.pinned_codes).toEqual(["special_founding_rider"]);
    expect(parsed.pinned_codes).toEqual(["special_founding_rider"]);
    expect(parsed.achievements).toHaveLength(1);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.code).toBe("special_founding_rider");
  });

  it("hardens sanitizer against out-of-range entities, blocks SVG data URIs, and removes Web checkout APIs", () => {
    // Regression check for RangeError DoS on out-of-bounds numeric HTML entities.
    expect(() =>
      sanitizeRichHtml('<a href="&#99999999;javascript:alert(1)">bad</a><p>Safe</p>'),
    ).not.toThrow();
    expect(sanitizeRichHtml("<p>Hello</p><script>evil()</script>")).toBe("<p>Hello</p>");

    expect(resolveMediaUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(resolveMediaUrl("javascript:alert(1)")).toBeNull();
    expect(resolveMediaUrl("data:image/png;base64,iVBOR")).toBe("data:image/png;base64,iVBOR");

    expect("createPaymentCheckout" in apiBilling).toBe(false);
    expect("fetchPaymentOrderStatus" in apiBilling).toBe(false);
    expect("cancelPaymentOrder" in apiBilling).toBe(false);

    expect(isAdminRole("Administrator")).toBe(true);
    expect(isAdminRole("member")).toBe(false);
    expect(getErrorMessage(new Error("Boom"), "Fallback")).toBe("Boom");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(formatRiderFullName({ first_name: "Rey", last_name: "Skywalker" })).toBe(
      "Rey Skywalker",
    );
    expect(formatDuration(3900)).toBe("1h 5m");
  });
});
