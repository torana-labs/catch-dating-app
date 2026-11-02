import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {"intake-review": true}
}

export default defineArea({
  id: "intake-review",
  path: "/intake/organizers",
  title: "Intake review",
  icon: "review",
  frame: "legacy-fill",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 140, section: "Older pages"},
    ops: {order: 100, section: "Older pages"},
  },
  routes: [
    route("/organizer-intake/*", "intake-review", {title: "Organizer intake"}),
    route("/intake/*", "intake-review", {title: "Organizer intake"}),
    route("/intake/events/*", "intake-review", {title: "Event intake"}),
    route("/intake/operations/*", "intake-review", {title: "Supply intake operations"}),
  ],
});
