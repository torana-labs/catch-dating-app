import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {"organizer-intake": true}
}

export default defineArea({
  id: "organizer-intake",
  path: "/inbox",
  title: "Inbox",
  icon: "review",
  frame: "redrawn",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 20, section: "Work", pinned: true},
    ops: {order: 20, section: "Work", pinned: true},
  },
  routes: [
    route("/inbox/*", "organizer-intake"),
    route("/inbox/:inboxItemId", "organizer-intake", {title: "Inbox item"}),
    // The old Intake review retired; its work is in the Inbox.
    route("/intake/*", "organizer-intake", {redirect: "/inbox"}),
    route("/organizer-intake/*", "organizer-intake", {redirect: "/inbox"}),
  ],
});
