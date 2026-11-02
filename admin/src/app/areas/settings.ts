import {defineArea, route} from "../adminAreaKit";

export type PaymentsEdit = "terms" | "organizer-terms" | "collection" | "credit" | "plans" | "messaging";

declare module "../adminAreaKit" {
  interface AdminNavIds {settings: true}
  interface AdminRouteFields {
    settingsPage: string | null;
    paymentsEdit: PaymentsEdit | null;
  }
}

/** Settings → Payments, one of its editors, and the organizer whose terms are open. */
export function paymentSettingsPath(edit: PaymentsEdit | null = null, organizerId: string | null = null): string {
  const base = "/settings/payments";
  if (edit === null) return base;
  return edit === "organizer-terms" && organizerId !== null ?
    `${base}/organizer-terms/${encodeURIComponent(organizerId)}` : `${base}/${edit}`;
}

export default defineArea({
  id: "settings",
  path: "/settings",
  title: "Settings",
  icon: "settings",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "safetyReviewer", "support"],
  navigation: {
    owner: {order: 120, section: "Setup"},
    ops: {order: 80, section: "Setup"},
  },
  routeDefaults: {settingsPage: null, paymentsEdit: null},
  routes: [
    route("/settings/*", "settings"),
    route("/settings/:settingsPage", "settings"),
    route("/settings/team/:teamMemberUid", "settings", {title: "Team and roles"}),
    route("/settings/payments/*", "settings", {settingsPage: "payments", title: "Payments"}),
    ...(["terms", "collection", "credit", "plans", "messaging"] as const).map((paymentsEdit) =>
      route(`/settings/payments/${paymentsEdit}`, "settings", {settingsPage: "payments", paymentsEdit, title: "Payments"})),
    route("/settings/payments/organizer-terms/:termsOrganizerId", "settings", {
      settingsPage: "payments", paymentsEdit: "organizer-terms", title: "Organizer terms",
    }),
    // Admin roles became Settings → Team and roles.
    route("/admin-roles/*", "settings", {redirect: "/settings/team"}),
    // The older payment screens became Settings → Payments; their issues are in Money.
    route("/finance/commercial-terms/*", "settings", {redirect: "/settings/payments"}),
    route("/finance/payment-routing/*", "settings", {redirect: "/settings/payments"}),
    route("/payment-setup/*", "settings", {redirect: "/settings/payments"}),
  ],
});
