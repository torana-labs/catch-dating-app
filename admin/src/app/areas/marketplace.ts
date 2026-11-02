import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {marketplace: true}
}

export default defineArea({
  id: "marketplace",
  path: "/marketplace",
  title: "Marketplace",
  icon: "insights",
  frame: "legacy",
  roles: owner,
  navigation: {
    owner: {order: 110, section: "Insights"},
  },
  routes: [
    route("/marketplace/*", "marketplace"),
  ],
});
