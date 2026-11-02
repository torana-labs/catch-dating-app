import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {users: true}
}

export default defineArea({
  id: "users",
  path: "/users",
  title: "User analytics",
  icon: "insights",
  frame: "legacy",
  roles: owner,
  navigation: {
    owner: {order: 160, section: "Older pages"},
  },
  routes: [
    route("/users/*", "users"),
  ],
});
