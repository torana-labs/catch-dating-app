import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Finance routes", () => {
  it("opens Finance at its own address", () => {
    const route = resolveAdminRoute("/finance");
    expect(route.nav).toBe("finance");
    expect(route.redirect).toBeNull();
  });
});
