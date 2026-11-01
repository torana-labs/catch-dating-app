import {describe, expect, it, vi} from "vitest";
import {
  adminPathForNav,
  adminSections,
  commercialTermsPathForOrganizer,
  financePathForWorkspace,
  moneyPath,
  resolveAdminRoute,
  type AdminNavId,
} from "./adminRoutes";

describe("Admin route contract", () => {
  it.each(Object.keys(adminSections) as AdminNavId[])("resolves the %s navigation destination", (nav) => {
    expect(resolveAdminRoute(adminPathForNav(nav)).nav).toBe(nav);
  });

  it.each([
    ["/safety/reports%2Freport-1", "safety", "targetPath", "reports/report-1"],
    ["/support/whatsapp-abc", "support", "supportConversationId", "whatsapp-abc"],
    ["/safety/actions/action-1", "safety", "safetyActionId", "action-1"],
    ["/safety/appeals/action-2", "safety", "safetyActionId", "action-2"],
    ["/organizers/afterfly", "organizers", "organizerId", "afterfly"],
    ["/organizers/claims/request-1", "organizers", "claimRequestId", "request-1"],
    ["/events/event-1", "events", "eventId", "event-1"],
    ["/events/external/candidate-1", "events", "externalEventId", "candidate-1"],
    ["/growth/signals/signal-1", "growth", "growthSignalId", "signal-1"],
    ["/money/issues/publicEventPayments%3Apay-1", "money", "moneyIssueId", "publicEventPayments:pay-1"],
    ["/money/resolved/payments%3Apay-2", "money", "moneyIssueId", "payments:pay-2"],
    ["/money/bills/org-1_2026-10", "money", "billId", "org-1_2026-10"],
    ["/payment-setup/issues/payments%2Fpayment-1", "payment-setup", "financeIssueId", "payments/payment-1"],
    ["/payment-setup/commercial-terms/organizers/org%2F1", "payment-setup", "termsOrganizerId", "org/1"],
    ["/quality/signals/source-1", "quality", "qualitySignalId", "source-1"],
    ["/settings/team/user-1", "settings", "teamMemberUid", "user-1"],
    ["/settings/safety", "settings", "settingsPage", "safety"],
    ["/sales/hosts/host-1", "sales", "salesOrganizerId", "host-1"],
    ["/inbox/supply-req%3A1", "organizer-intake", "inboxItemId", "supply-req:1"],
    ["/marketing/drafts/draft%20one/copy", "marketing-ops", "draftId", "draft one"],
  ])("resolves %s", (path, nav, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe(nav);
    expect(route.params[key]).toBe(value);
  });

  it("opens Safety's views and sends old launch access links to Safety", () => {
    expect(resolveAdminRoute("/safety").safetyView).toBe("open");
    expect(resolveAdminRoute("/safety/actions").safetyView).toBe("actions");
    expect(resolveAdminRoute("/safety/appeals/a1").safetyView).toBe("appeals");
    expect(resolveAdminRoute("/access/user-1").redirect).toBe("/safety");
  });

  it("sends old Admin roles links to Team and roles", () => {
    expect(resolveAdminRoute("/admin-roles/user-1").redirect).toBe("/settings/team");
  });

  it.each([
    ["/organizers/claims", "organizerWorkspace", "claims", "organizerId"],
    ["/events/readiness/", "eventWorkspace", "directory", "eventId"],
    ["/events/external", "eventWorkspace", "external", "eventId"],
    ["/payment-setup/commercial-terms", "financeWorkspace", "commercial-terms", "financeIssueId"],
    ["/payment-setup/payment-routing", "financeWorkspace", "payment-routing", "financeIssueId"],
    ["/payment-setup", "financeWorkspace", "issues", "financeIssueId"],
    ["/money", "moneyView", "issues", "moneyIssueId"],
    ["/money/resolved", "moneyView", "resolved", "moneyIssueId"],
    ["/money/bills", "moneyView", "bills", "billId"],
  ])("does not mistake the %s workspace for a record", (path, key, value, recordKey) => {
    const route = resolveAdminRoute(path);
    expect(route).toHaveProperty(key, value);
    expect(route.params[recordKey]).toBeUndefined();
  });

  it("builds Money paths that resolve back to their view and record", () => {
    for (const [view, id] of [["issues", "payments:a/b"], ["resolved", "payments:c"], ["bills", "org_2026-10"]] as const) {
      const route = resolveAdminRoute(moneyPath(view, id));
      expect(route.moneyView).toBe(view);
      expect(route.params.billId ?? route.params.moneyIssueId).toBe(id);
      expect(resolveAdminRoute(moneyPath(view)).moneyView).toBe(view);
    }
  });

  it("sends old Finance links to Money and the payment setup screens", () => {
    expect(resolveAdminRoute("/finance").redirect).toBe("/money");
    expect(resolveAdminRoute("/finance/issues/x").redirect).toBe("/money");
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

  it("preserves marketing workspace and draft-step defaults", () => {
    expect(resolveAdminRoute("/marketing").marketingTab).toBe("posts");
    expect(resolveAdminRoute("/marketing/media").marketingTab).toBe("media");
    expect(resolveAdminRoute("/marketing/drafts/a/copy")).toMatchObject({
      marketingTab: "draft", composerStep: "copy", title: "Marketing draft",
    });
    expect(resolveAdminRoute("/marketing/drafts/a/unknown")).toMatchObject({
      marketingTab: "draft", composerStep: "source", params: {draftId: "a"},
    });
  });

  it("opens the directory for links to the retired readiness workspace", () => {
    expect(resolveAdminRoute("/events/readiness/source%2Faction")).toMatchObject({
      nav: "events", eventWorkspace: "directory",
    });
    expect(resolveAdminRoute("/events/readiness/source%2Faction").params.eventId).toBeUndefined();
  });

  it("keeps unknown nested paths in their workspace without borrowing a record", () => {
    expect(resolveAdminRoute("/events/unknown/extra")).toMatchObject({nav: "events", eventWorkspace: "directory"});
    expect(resolveAdminRoute("/events/unknown/extra").params.eventId).toBeUndefined();
    expect(resolveAdminRoute("/events/trivia/page")).toMatchObject({nav: "events", eventTab: "page",
      params: {eventId: "trivia"}});
    expect(resolveAdminRoute("/organizers/afterfly/money")).toMatchObject({nav: "organizers",
      organizerTab: "money", params: {organizerId: "afterfly"}});
    expect(resolveAdminRoute("/organizers/afterfly/unknown").params.organizerId).toBeUndefined();
    expect(resolveAdminRoute("/not-a-section").nav).toBeNull();
    expect(resolveAdminRoute("/")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/overview")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/cross-paths")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/users").redirect).toBeNull();
    expect(resolveAdminRoute("/now").redirect).toBeNull();
  });

  it.each(["a/b", "a%2Fb", "a%25b", "a b", "a?b", "a#b"])("round-trips the opaque ID %s without decoding it twice", (id) => {
    expect(resolveAdminRoute(`/events/${encodeURIComponent(id)}`).params.eventId).toBe(id);
  });

  it("accepts malformed percent encoding without crashing the shell", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(resolveAdminRoute("/events/record%invalid").params.eventId).toBe("record%invalid");
    } finally {
      warning.mockRestore();
    }
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
    ["/events/external", "External inventory"],
  ])("retains the title for %s", (path, title) => {
    expect(resolveAdminRoute(path).title).toBe(title);
  });
});
