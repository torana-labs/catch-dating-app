import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {"sales-deals": true}
}

export default defineArea({
  id: "sales-deals",
  path: "/sales/deals",
  title: "Deals",
  icon: "partner",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "salesStaff"],
  navigation: {
    sales: {order: 30, section: "Sales"},
  },
  routes: [
    route("/sales/deals/*", "sales-deals"),
  ],
});
