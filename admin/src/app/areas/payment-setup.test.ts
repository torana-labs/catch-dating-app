import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";
import {commercialTermsPathForOrganizer, financePathForWorkspace} from "./payment-setup";

describe("Payment setup routes", () => {
  it.each([
    ["/payment-setup/issues/payments%2Fpayment-1", "financeIssueId", "payments/payment-1"],
    ["/payment-setup/commercial-terms/organizers/org%2F1", "termsOrganizerId", "org/1"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("payment-setup");
    expect(route.params[key]).toBe(value);
  });

  it.each([
    ["/payment-setup/commercial-terms", "commercial-terms"],
    ["/payment-setup/payment-routing", "payment-routing"],
    ["/payment-setup", "issues"],
  ])("does not mistake the %s workspace for a record", (path, workspace) => {
    const route = resolveAdminRoute(path);
    expect(route.financeWorkspace).toBe(workspace);
    expect(route.params.financeIssueId).toBeUndefined();
  });

  it("sends old Finance links to the payment setup screens", () => {
    expect(resolveAdminRoute("/finance/commercial-terms/organizers/o").redirect).toBe("/payment-setup/commercial-terms");
    expect(resolveAdminRoute("/finance/payment-routing").redirect).toBe("/payment-setup/payment-routing");
  });

  it("builds finance workspace paths that resolve back to their workspace", () => {
    expect(resolveAdminRoute(financePathForWorkspace("payment-routing")).financeWorkspace)
      .toBe("payment-routing");
    expect(resolveAdminRoute(financePathForWorkspace("issues")).financeWorkspace).toBe("issues");
    const organizerPath = commercialTermsPathForOrganizer("club/a b");
    expect(resolveAdminRoute(organizerPath)).toMatchObject({
      financeWorkspace: "commercial-terms", params: {termsOrganizerId: "club/a b"},
    });
    expect(resolveAdminRoute(commercialTermsPathForOrganizer(null)).params.termsOrganizerId)
      .toBeUndefined();
  });
});
