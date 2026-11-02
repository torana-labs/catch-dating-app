import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Growth routes", () => {
  it("resolves a signal", () => {
    const route = resolveAdminRoute("/growth/signals/signal-1");
    expect(route.nav).toBe("growth");
    expect(route.params.growthSignalId).toBe("signal-1");
  });
});
