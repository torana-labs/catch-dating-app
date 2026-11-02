import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {sales: true}
  interface AdminRouteFields {
    salesArea: "today" | "hosts" | "settings" | "pipeline" | "pilots" | "research";
  }
}

export default defineArea({
  id: "sales",
  path: "/sales/today",
  title: "Sales",
  icon: "partner",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "salesStaff"],
  navigation: {
    owner: {order: 50, section: "Work", pinned: true, alsoActive: ["sales-hosts", "sales-deals"]},
    sales: {order: 10, section: "Sales", pinned: true, label: "Today"},
  },
  routeDefaults: {salesArea: "today"},
  routes: [
    route("/sales/*", "sales"),
    route("/sales/today/*", "sales", {salesArea: "today"}),
    route("/sales/today/:salesTaskId", "sales", {salesArea: "today", title: "Task"}),
    route("/sales/settings/*", "sales", {salesArea: "settings", title: "Sales settings"}),
    // The older Sales pages keep the tools the new screens don't have yet: editing a host, stage
    // moves, pilot plans, quotes, adding and nominating. Each goes when its replacement lands.
    route("/sales/hosts/:salesOrganizerId/tools", "sales", {salesArea: "hosts", title: "Host tools"}),
    route("/sales/add-host/*", "sales", {salesArea: "hosts", title: "Add or nominate a host"}),
    ...(["pipeline", "pilots", "research"] as const).map((salesArea) =>
      route(`/sales/${salesArea}/*`, "sales", {salesArea, title: "Older Sales page"})),
  ],
});
