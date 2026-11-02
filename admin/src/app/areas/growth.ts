import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {growth: true}
}

export default defineArea({
  id: "growth",
  path: "/growth",
  title: "Growth",
  icon: "trend",
  frame: "legacy",
  roles: owner,
  navigation: {
    owner: {order: 100, section: "Insights"},
  },
  routes: [
    route("/growth/*", "growth"),
    route("/growth/signals/:growthSignalId", "growth", {title: "Growth signal"}),
  ],
});
