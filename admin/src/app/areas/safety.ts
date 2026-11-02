import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {safety: true}
  interface AdminRouteFields {
    safetyView: "open" | "actions" | "appeals";
  }
}

export default defineArea({
  id: "safety",
  path: "/safety",
  title: "Safety",
  icon: "safety",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "safetyReviewer", "support"],
  navigation: {
    owner: {order: 30, section: "Work"},
    ops: {order: 30, section: "Work", pinned: true},
  },
  routeDefaults: {safetyView: "open"},
  routes: [
    route("/safety/*", "safety"),
    route("/safety/:targetPath", "safety", {title: "Safety case"}),
    route("/safety/actions/*", "safety", {safetyView: "actions", title: "Account actions"}),
    route("/safety/actions/:safetyActionId", "safety", {safetyView: "actions", title: "Account action"}),
    route("/safety/appeals/*", "safety", {safetyView: "appeals", title: "Appeals"}),
    route("/safety/appeals/:safetyActionId", "safety", {safetyView: "appeals", title: "Appeal"}),
    // Launch access moved into the Safety queue.
    route("/access/*", "safety", {redirect: "/safety"}),
  ],
});
