import {allButSales, defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {now: true}
}

export default defineArea({
  id: "now",
  path: "/now",
  title: "Needs you",
  icon: "home",
  frame: "redrawn",
  roles: allButSales,
  navigation: {
    owner: {order: 10, pinned: true},
    ops: {order: 10, pinned: true},
  },
  routes: [
    route("/", "now", {redirect: "/now"}),
    // Overview split in two: its queues are Needs you, its analytics Marketplace.
    route("/overview/*", "now", {redirect: "/now"}),
    // The Cross Paths page is retired; old links land on Needs you.
    route("/cross-paths/*", "now", {redirect: "/now"}),
    route("/now/*", "now"),
  ],
});
