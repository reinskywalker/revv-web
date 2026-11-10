import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches core marketing and auth pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/login").at(-1)?.routeId).toBe("/login");
    expect(router.matchRoutes("/register").at(-1)?.routeId).toBe("/register");
    expect(router.matchRoutes("/news").at(-1)?.routeId).toBe("/news");
  });

  it("matches dedicated application routes (/garage, /admin)", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/garage").at(-1)?.routeId).toBe("/garage");
    expect(router.matchRoutes("/admin").at(-1)?.routeId).toBe("/admin");
  });

  it("matches dynamic rider username profiles (/id/:username)", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const match = router.matchRoutes("/id/scobby").at(-1);
    expect(match?.routeId).toBe("/id/$username");
  });
});
