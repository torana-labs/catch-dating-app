import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {sales: true}
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
  routes: [
    route("/sales/*", "sales"),
    route("/sales/today/*", "sales"),
    route("/sales/today/:salesTaskId", "sales", {title: "Task"}),
    route("/sales/settings/*", "sales", {redirect: "/settings/sales"}),
    // A host's old tools became Private details and the History tab on its page.
    route("/sales/hosts/:salesOrganizerId/tools", "sales", {redirect: "/sales/hosts"}),
    // These became the Deals board and the Hosts filters.
    route("/sales/pipeline/*", "sales", {redirect: "/sales/deals"}),
    route("/sales/pilots/*", "sales", {redirect: "/sales/deals"}),
    route("/sales/research/*", "sales", {redirect: "/sales/hosts"}),
  ],
});
