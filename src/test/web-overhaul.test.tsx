import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppOpenBanner } from "@/components/revv/AppOpenBanner";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import { saveAuthSession, clearSavedSession } from "@/lib/api";
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

  it("renders squircle RevvAvatar, PNG frame rim, and top-right VerifiedCheckBadge", () => {
    const { container } = render(
      <RevvAvatar name="Reinsky" frameCode="verified_patron" size={64} showVerifiedBadge={true} />,
    );

    const squirclePhoto = container.querySelector(".rounded-\\[19\\%\\]");
    expect(squirclePhoto).not.toBeNull();

    const frameImg = container.querySelector('img[src="/frames/frame_verified_patron.png"]');
    expect(frameImg).not.toBeNull();

    const badgeImg = screen.getByAltText("Verified REVV Member");
    expect(badgeImg.getAttribute("src")).toBe("/frames/badge_verified_blue.png");
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
});
