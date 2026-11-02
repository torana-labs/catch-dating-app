import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {operations: true}
}

export default defineArea({
  id: "operations",
  path: "/operations",
  title: "Agent activity",
  icon: "bot",
  frame: "legacy",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 180, section: "Older pages"},
    ops: {order: 110, section: "Older pages"},
  },
  routes: [
    route("/operations/*", "operations"),
  ],
});
