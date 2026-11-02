import {describe, expect, it} from "vitest";
import {adminPathForNav, resolveAdminRoute} from "../adminRoutes";

describe("Inbox routes", () => {
  it("resolves an item", () => {
    const route = resolveAdminRoute("/inbox/supply-req%3A1");
    expect(route.nav).toBe("organizer-intake");
    expect(route.params.inboxItemId).toBe("supply-req:1");
  });

  it("puts the inbox on the Intake nav and keeps the old review addresses", () => {
    expect(adminPathForNav("organizer-intake")).toBe("/inbox");
    for (const path of ["/intake/organizers", "/intake/events", "/organizer-intake/listings"]) {
      expect(resolveAdminRoute(path).nav).toBe("intake-review");
    }
  });

  it.each([
    ["/intake/organizers", "Organizer intake"],
    ["/intake/events", "Event intake"],
    ["/intake/operations", "Supply intake operations"],
  ])("retains the title for %s", (path, title) => {
    expect(resolveAdminRoute(path).title).toBe(title);
  });
});
