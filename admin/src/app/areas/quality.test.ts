import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Data quality routes", () => {
  it("resolves a signal", () => {
    const route = resolveAdminRoute("/quality/signals/source-1");
    expect(route.nav).toBe("quality");
    expect(route.params.qualitySignalId).toBe("source-1");
  });
});
