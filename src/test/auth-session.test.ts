import { beforeEach, describe, expect, it } from "vitest";
import {
  checkUrlForAuthTokens,
  clearSavedSession,
  getSavedSession,
  saveAuthSession,
} from "@/lib/api";

describe("REVV Web Auth & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("saves and retrieves session tokens without logging out on reload", () => {
    saveAuthSession({
      access_token: "test-jwt-access-token",
      refresh_token: "test-jwt-refresh-token",
      riderId: "rider-12345",
      username: "scobby",
    });

    const session = getSavedSession();
    expect(session.token).toBe("test-jwt-access-token");
    expect(session.refreshToken).toBe("test-jwt-refresh-token");
    expect(session.riderId).toBe("rider-12345");
    expect(session.username).toBe("scobby");
  });

  it("handles clearing saved session completely", () => {
    saveAuthSession({
      access_token: "jwt-to-clear",
      riderId: "rider-99",
      username: "moto_fan",
    });

    clearSavedSession();
    const session = getSavedSession();
    expect(session.token).toBeNull();
    expect(session.riderId).toBeNull();
    expect(session.username).toBeNull();
  });

  it("extracts OAuth tokens from URL query parameters and cleans up history", () => {
    // Setup window location search
    const fakeUrl = "http://localhost:3000/login?access_token=oauth-access-token&refresh_token=oauth-refresh-token&username=scobby_rider";
    delete (window as unknown as { location: unknown }).location;
    window.location = new URL(fakeUrl) as unknown as Location;

    const session = checkUrlForAuthTokens();
    expect(session).not.toBeNull();
    expect(session?.token).toBe("oauth-access-token");
    expect(session?.refreshToken).toBe("oauth-refresh-token");
    expect(session?.username).toBe("scobby_rider");

    // Check stored session
    const stored = getSavedSession();
    expect(stored.token).toBe("oauth-access-token");
    expect(stored.username).toBe("scobby_rider");
  });
});
