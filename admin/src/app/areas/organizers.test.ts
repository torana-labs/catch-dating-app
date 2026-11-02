import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Organizer routes", () => {
  it("resolves an organizer record", () => {
    const route = resolveAdminRoute("/organizers/afterfly");
    expect(route.nav).toBe("organizers");
    expect(route.params.organizerId).toBe("afterfly");
  });

  it("sends old claim links to the Inbox", () => {
    expect(resolveAdminRoute("/organizers/claims").redirect).toBe("/inbox");
    expect(resolveAdminRoute("/organizers/claims/request-1").redirect).toBe("/inbox");
  });

  it("keeps unknown nested paths in their workspace without borrowing a record", () => {
    expect(resolveAdminRoute("/organizers/afterfly/money")).toMatchObject({nav: "organizers",
      organizerTab: "money", params: {organizerId: "afterfly"}});
    expect(resolveAdminRoute("/organizers/afterfly/unknown").params.organizerId).toBeUndefined();
  });
});
