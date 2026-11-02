import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {finance: true}
}

export default defineArea({
  id: "finance",
  path: "/finance",
  title: "Finance",
  icon: "chart",
  frame: "redrawn",
  roles: owner,
  navigation: {
    owner: {order: 115, section: "Insights"},
  },
  routes: [
    route("/finance/*", "finance"),
  ],
});
