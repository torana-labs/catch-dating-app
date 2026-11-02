import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {people: true}
}

export default defineArea({
  id: "people",
  path: "/people",
  title: "People",
  icon: "people",
  frame: "redrawn",
  roles: ["admin", "adminOwner", "safetyReviewer", "support"],
  navigation: {
    owner: {order: 90, section: "Records"},
    ops: {order: 70, section: "Records"},
  },
  routes: [
    route("/people/*", "people"),
  ],
});
