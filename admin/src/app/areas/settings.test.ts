import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Settings routes", () => {
  it.each([
    ["/settings/team/user-1", "teamMemberUid", "user-1"],
    ["/settings/safety", "settingsPage", "safety"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("settings");
    expect(route.params[key]).toBe(value);
  });

  it("sends old Admin roles links to Team and roles", () => {
    expect(resolveAdminRoute("/admin-roles/user-1").redirect).toBe("/settings/team");
  });
});
