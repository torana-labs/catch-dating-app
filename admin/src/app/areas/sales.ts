import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {sales: true}
  interface AdminRouteFields {
    salesArea: "today" | "hosts" | "settings";
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
    // The older Sales pages keep what the new screens don't have yet: a host's custom fields and imported history.
    route("/sales/hosts/:salesOrganizerId/tools", "sales", {salesArea: "hosts", title: "Host tools"}),
    // These became the Deals board and the Hosts filters.
    route("/sales/pipeline/*", "sales", {redirect: "/sales/deals"}),
    route("/sales/pilots/*", "sales", {redirect: "/sales/deals"}),
    route("/sales/research/*", "sales", {redirect: "/sales/hosts"}),
  ],
});
