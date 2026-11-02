import {adminRoleClaimKeys, defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {more: true}
}

export default defineArea({
  id: "more",
  path: "/more",
  title: "More",
  icon: "more",
  frame: "redrawn",
  roles: adminRoleClaimKeys,
  routes: [
    route("/more/*", "more"),
  ],
});
