import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {"sales-hosts": true}
  interface AdminRouteFields {salesHostPage: "main" | "fit" | "privacy" | "demo"}
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
  routeDefaults: {salesHostPage: "main"},
  routes: [
    route("/sales/hosts/*", "sales-hosts"),
    route("/sales/hosts/:salesOrganizerId", "sales-hosts", {title: "Host"}),
    route("/sales/hosts/:salesOrganizerId/fit", "sales-hosts", {title: "Fit and outreach", salesHostPage: "fit"}),
    route("/sales/hosts/:salesOrganizerId/privacy", "sales-hosts", {title: "Privacy", salesHostPage: "privacy"}),
    route("/sales/hosts/:salesOrganizerId/demo", "sales-hosts", {title: "Private demo", salesHostPage: "demo"}),
  ],
});
