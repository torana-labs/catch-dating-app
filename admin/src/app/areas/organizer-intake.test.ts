import {describe, expect, it} from "vitest";
import {adminPathForNav, resolveAdminRoute} from "../adminRoutes";

describe("Inbox routes", () => {
  it("resolves an item", () => {
    const route = resolveAdminRoute("/inbox/supply-req%3A1");
    expect(route.nav).toBe("organizer-intake");
    expect(route.params.inboxItemId).toBe("supply-req:1");
  });

  it("sends the old Intake review addresses to the inbox", () => {
    expect(adminPathForNav("organizer-intake")).toBe("/inbox");
    for (const path of ["/intake", "/intake/organizers", "/intake/events", "/intake/operations", "/organizer-intake/listings"]) {
      expect(resolveAdminRoute(path).redirect).toBe("/inbox");
    }
  });
});
