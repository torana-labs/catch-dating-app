import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {organizers: true}
  interface AdminRouteFields {
    organizerWorkspace: "directory" | "claims";
    organizerTab: "overview" | "page" | "events" | "sales" | "money" | "history";
  }
}

export default defineArea({
  id: "organizers",
  path: "/organizers",
  title: "Organizers",
  icon: "organizer",
  frame: "redrawn",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 70, section: "Records"},
    sales: {order: 50, section: "Records"},
    ops: {order: 50, section: "Records"},
  },
  routeDefaults: {organizerWorkspace: "directory", organizerTab: "overview"},
  routes: [
    route("/organizers/*", "organizers"),
    route("/organizers/:organizerId", "organizers"),
    ...(["page", "events", "sales", "money", "history"] as const).map((organizerTab) =>
      route(`/organizers/:organizerId/${organizerTab}`, "organizers", {organizerTab})),
    route("/organizers/claims/*", "organizers", {organizerWorkspace: "claims"}),
    route("/organizers/claims/:claimRequestId", "organizers", {organizerWorkspace: "claims"}),
  ],
});
