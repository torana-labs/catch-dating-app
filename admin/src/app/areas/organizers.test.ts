import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Organizer routes", () => {
  it.each([
    ["/organizers/afterfly", "organizerId", "afterfly"],
    ["/organizers/claims/request-1", "claimRequestId", "request-1"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("organizers");
    expect(route.params[key]).toBe(value);
  });

  it("does not mistake the claims workspace for a record", () => {
    const route = resolveAdminRoute("/organizers/claims");
    expect(route.organizerWorkspace).toBe("claims");
    expect(route.params.organizerId).toBeUndefined();
  });

  it("keeps unknown nested paths in their workspace without borrowing a record", () => {
    expect(resolveAdminRoute("/organizers/afterfly/money")).toMatchObject({nav: "organizers",
      organizerTab: "money", params: {organizerId: "afterfly"}});
    expect(resolveAdminRoute("/organizers/afterfly/unknown").params.organizerId).toBeUndefined();
  });
});
