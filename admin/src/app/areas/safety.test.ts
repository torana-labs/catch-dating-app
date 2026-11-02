import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Safety routes", () => {
  it.each([
    ["/safety/reports%2Freport-1", "targetPath", "reports/report-1"],
    ["/safety/actions/action-1", "safetyActionId", "action-1"],
    ["/safety/appeals/action-2", "safetyActionId", "action-2"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("safety");
    expect(route.params[key]).toBe(value);
  });

  it("opens Safety's views and sends old launch access links to Safety", () => {
    expect(resolveAdminRoute("/safety").safetyView).toBe("open");
    expect(resolveAdminRoute("/safety/actions").safetyView).toBe("actions");
    expect(resolveAdminRoute("/safety/appeals/a1").safetyView).toBe("appeals");
    expect(resolveAdminRoute("/access/user-1").redirect).toBe("/safety");
  });
});
