import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {nominations: true}
}

export default defineArea({
  id: "nominations",
  path: "/sales/nominations",
  title: "My nominations",
  icon: "review",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "support", "salesStaff"],
  navigation: {
    sales: {order: 40, section: "Sales"},
  },
  routes: [
    route("/sales/nominations/*", "nominations"),
    route("/sales/nominations/:nominationItemId", "nominations", {title: "Nomination"}),
  ],
});
