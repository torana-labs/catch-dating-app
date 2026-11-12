import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {cityInterest: true}
}

export default defineArea({
  id: "cityInterest",
  path: "/city-interest",
  title: "Interest by city",
  icon: "insights",
  frame: "redrawn",
  roles: owner,
  navigation: {
    owner: {order: 115, section: "Insights"},
  },
  routes: [
    route("/city-interest/*", "cityInterest"),
  ],
});
