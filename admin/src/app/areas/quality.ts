import {defineArea, owner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {quality: true}
}

export default defineArea({
  id: "quality",
  path: "/quality",
  title: "Data quality",
  icon: "data",
  frame: "legacy",
  roles: owner,
  navigation: {
    owner: {order: 170, section: "Older pages"},
  },
  routes: [
    route("/quality/*", "quality"),
    route("/quality/signals/:qualitySignalId", "quality", {title: "Data quality signal"}),
  ],
});
