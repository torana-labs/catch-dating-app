import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";
import {growthPath} from "./growth";

describe("Growth routes", () => {
  it("resolves a nominator", () => {
    const route = resolveAdminRoute("/growth/nominators/sample-neha");
    expect(route.nav).toBe("growth");
    expect(route.params.nominatorUid).toBe("sample-neha");
  });

  it("builds Growth paths that resolve back to their view, and sends old signal links to Growth", () => {
    for (const view of ["cohorts", "channels", "nominators", "best"] as const) {
      expect(resolveAdminRoute(growthPath(view)).growthView).toBe(view);
    }
    expect(resolveAdminRoute(growthPath("nominators", "a b")).params.nominatorUid).toBe("a b");
    expect(resolveAdminRoute("/growth/signals/signal-1").redirect).toBe("/growth");
  });
});
