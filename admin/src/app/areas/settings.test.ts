import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";
import {paymentSettingsPath} from "./settings";

describe("Settings routes", () => {
  it.each([
    ["/settings/team/user-1", "teamMemberUid", "user-1"],
    ["/settings/safety", "settingsPage", "safety"],
    ["/settings/payments/organizer-terms/org%2F1", "termsOrganizerId", "org/1"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("settings");
    expect(route.params[key]).toBe(value);
  });

  it("sends old Admin roles links to Team and roles", () => {
    expect(resolveAdminRoute("/admin-roles/user-1").redirect).toBe("/settings/team");
  });

  it("sends the old payment screens to Settings → Payments", () => {
    expect(resolveAdminRoute("/finance/commercial-terms/organizers/o").redirect).toBe("/settings/payments");
    expect(resolveAdminRoute("/finance/payment-routing").redirect).toBe("/settings/payments");
    expect(resolveAdminRoute("/payment-setup/commercial-terms").redirect).toBe("/settings/payments");
  });

  it("builds Payments paths that resolve back to their page, editor and organizer", () => {
    expect(resolveAdminRoute(paymentSettingsPath()).settingsPage).toBe("payments");
    expect(resolveAdminRoute(paymentSettingsPath()).paymentsEdit).toBeNull();
    for (const edit of ["terms", "collection", "credit", "plans", "messaging"] as const) {
      expect(resolveAdminRoute(paymentSettingsPath(edit)).paymentsEdit).toBe(edit);
    }
    const organizer = resolveAdminRoute(paymentSettingsPath("organizer-terms", "club/a b"));
    expect(organizer).toMatchObject({paymentsEdit: "organizer-terms", params: {termsOrganizerId: "club/a b"}});
  });
});
