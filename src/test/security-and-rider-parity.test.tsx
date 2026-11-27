import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RiderOverviewPanel } from "@/components/profile/RiderOverviewPanel";
import {
  clearSavedSession,
  type PublicProfileResponse,
  saveAuthSession,
  tryRefreshSession,
} from "@/lib/api";
import { sanitizeRichHtml } from "@/lib/html-sanitizer";

function makeProfile(overrides: Partial<PublicProfileResponse> = {}): PublicProfileResponse {
  return {
    id: "rider-1",
    username: "alex",
    noreg: null,
    first_name: "Alex",
    middle_name: null,
    last_name: "Rider",
    avatar_url: null,
    banner_url: null,
    bio: null,
    city: "Jakarta",
    country: "Indonesia",
    job: "Engineer",
    account_visibility: "PUBLIC",
    is_friend: false,
    has_pending_request: false,
    is_private: false,
    motorcycle_count: 1,
    garage: [
      {
        id: "bike-1",
        brand_name: "Honda",
        series_name: "PCX 160",
        nickname: null,
        image_url: null,
        image_path: null,
        plate_number: null,
        manufacture_year: null,
        engine_capacity_cc: 160,
        transmission: "matic",
        category: "scooter",
        current_mileage: 4500,
        is_primary: true,
      },
    ],
    posts: [],
    ...overrides,
  };
}

describe("Web Security & Rider Parity", () => {
  beforeEach(() => {
    clearSavedSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sanitizes XSS vectors in both DOMParser and SSR fallback modes", () => {
    const dirty =
      '<p>Hello <strong>Riders</strong></p><script>alert(1)</script><svg onload="alert(2)"></svg><img src="x" onerror="alert(3)" /><a href="javascript:alert(4)">Click</a><a href="https://revv.id">Safe</a>';

    const browserClean = sanitizeRichHtml(dirty);
    expect(browserClean).not.toContain("<script");
    expect(browserClean).not.toContain("<svg");
    expect(browserClean).not.toContain("onerror");
    expect(browserClean).not.toContain("javascript:");
    expect(browserClean).toContain("<strong>Riders</strong>");
    expect(browserClean).toContain("https://revv.id");

    const origDomParser = globalThis.DOMParser;
    Object.defineProperty(globalThis, "DOMParser", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const ssrClean = sanitizeRichHtml(dirty);
      expect(ssrClean).not.toContain("<script");
      expect(ssrClean).not.toContain("<svg");
      expect(ssrClean).not.toContain("onerror");
      expect(ssrClean).not.toContain("javascript:");
      expect(ssrClean).toContain("<strong>Riders</strong>");
      expect(ssrClean).toContain("https://revv.id");
    } finally {
      Object.defineProperty(globalThis, "DOMParser", {
        value: origDomParser,
        configurable: true,
        writable: true,
      });
    }
  });

  it("coalesces concurrent tryRefreshSession calls via single-flight mutex", async () => {
    saveAuthSession("expired-token", "refresh-xyz", "rider-1");

    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  status: true,
                  data: {
                    access_token: "fresh-access-1",
                    refresh_token: "fresh-refresh-2",
                  },
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
              ),
            );
          }, 10);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([tryRefreshSession(), tryRefreshSession()]);

    expect(first).toBe("fresh-access-1");
    expect(second).toBe("fresh-access-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("respects FRIENDS_ONLY and CUSTOM granular visibility flags in RiderOverviewPanel", () => {
    const { rerender } = render(
      <RiderOverviewPanel
        profile={makeProfile({
          is_private: true,
          account_visibility: "FRIENDS_ONLY",
        })}
      />,
    );
    expect(screen.getByText(/Rider Overview \(Friends Only\)/i)).toBeInTheDocument();

    rerender(
      <RiderOverviewPanel
        profile={makeProfile({
          is_private: false,
          account_visibility: "CUSTOM",
          show_city: false,
          show_country: false,
          show_garage_details: false,
          garage: [],
        })}
      />,
    );
    const hiddenCells = screen.getAllByText("Hidden");
    expect(hiddenCells.length).toBe(3);
  });
});
