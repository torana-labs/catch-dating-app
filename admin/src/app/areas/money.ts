import {defineArea, owner, route} from "../adminAreaKit";

export type MoneyView = "issues" | "resolved" | "bills";

declare module "../adminAreaKit" {
  interface AdminNavIds {money: true}
  interface AdminRouteFields {
    moneyView: MoneyView;
  }
}

/** Money's view, and one issue or bill in it. */
export function moneyPath(view: MoneyView, id: string | null = null): string {
  const base = view === "issues" ? "/money" : `${"/money"}/${view}`;
  if (id === null) return base;
  return `${view === "issues" ? `${base}/issues` : base}/${encodeURIComponent(id)}`;
}

export default defineArea({
  id: "money",
  path: "/money",
  title: "Money",
  icon: "payment",
  frame: "redrawn",
  roles: owner,
  navigation: {
    owner: {order: 60, section: "Work"},
  },
  routeDefaults: {moneyView: "issues"},
  routes: [
    route("/money/*", "money"),
    route("/money/resolved/*", "money", {moneyView: "resolved"}),
    route("/money/resolved/:moneyIssueId", "money", {moneyView: "resolved", title: "Resolved payment issue"}),
    route("/money/issues/:moneyIssueId", "money", {title: "Payment issue"}),
    route("/money/bills/*", "money", {moneyView: "bills", title: "Bills"}),
    route("/money/bills/:billId", "money", {moneyView: "bills", title: "Bill"}),
    // The old Finance address; Settings keeps the redirects for terms and routing.
    route("/finance/*", "money", {redirect: "/money"}),
  ],
});
