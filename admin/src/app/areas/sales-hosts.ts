import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {"sales-hosts": true}
}

export default defineArea({
  id: "sales-hosts",
  path: "/sales/hosts",
  title: "Hosts",
  icon: "business",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "salesStaff"],
  navigation: {
    sales: {order: 20, section: "Sales", pinned: true},
  },
  routes: [
    route("/sales/hosts/*", "sales-hosts"),
    route("/sales/hosts/:salesOrganizerId", "sales-hosts", {title: "Host"}),
  ],
});
