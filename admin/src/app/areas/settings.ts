import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {settings: true}
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
  routes: [
    route("/settings/*", "settings"),
    route("/settings/:settingsPage", "settings"),
    route("/settings/team/:teamMemberUid", "settings", {title: "Team and roles"}),
    // Admin roles became Settings → Team and roles.
    route("/admin-roles/*", "settings", {redirect: "/settings/team"}),
  ],
});
