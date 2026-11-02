import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {system: true}
}

export default defineArea({
  id: "system",
  path: "/system",
  title: "System",
  icon: "data",
  frame: "redrawn",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 130, section: "Setup"},
    ops: {order: 90, section: "Setup"},
  },
  routes: [
    route("/system/*", "system"),
  ],
});
