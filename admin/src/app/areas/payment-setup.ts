import {defineArea, owner, route} from "../adminAreaKit";

export type FinanceWorkspace = "issues" | "commercial-terms" | "payment-routing";

declare module "../adminAreaKit" {
  interface AdminNavIds {"payment-setup": true}
  interface AdminRouteFields {
    financeWorkspace: FinanceWorkspace;
  }
}

export function commercialTermsPathForOrganizer(organizerId: string | null): string {
  return organizerId === null ? financePathForWorkspace("commercial-terms") :
    `/payment-setup/commercial-terms/organizers/${encodeURIComponent(organizerId)}`;
}

export function financePathForWorkspace(workspace: FinanceWorkspace): string {
  return workspace === "issues" ? "/payment-setup" : `/payment-setup/${workspace}`;
}

export default defineArea({
  id: "payment-setup",
  path: "/payment-setup",
  title: "Payment setup",
  icon: "settings",
  frame: "legacy",
  roles: owner,
  navigation: {
    owner: {order: 150, section: "Older pages"},
  },
  routeDefaults: {financeWorkspace: "issues"},
  routes: [
    route("/payment-setup/*", "payment-setup"),
    route("/finance/commercial-terms/*", "payment-setup", {redirect: "/payment-setup/commercial-terms"}),
    route("/finance/payment-routing/*", "payment-setup", {redirect: "/payment-setup/payment-routing"}),
    route("/payment-setup/issues/:financeIssueId", "payment-setup", {title: "Finance issue"}),
    route("/payment-setup/commercial-terms/*", "payment-setup", {financeWorkspace: "commercial-terms", title: "Commercial terms"}),
    route("/payment-setup/commercial-terms/organizers/:termsOrganizerId", "payment-setup", {
      financeWorkspace: "commercial-terms", title: "Organizer commercial terms",
    }),
    route("/payment-setup/payment-routing/*", "payment-setup", {financeWorkspace: "payment-routing", title: "Payment routing"}),
  ],
});
