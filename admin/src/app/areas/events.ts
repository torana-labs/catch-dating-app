import {defineArea, opsAndOwner, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {events: true}
  interface AdminRouteFields {
    eventWorkspace: "directory" | "external";
    eventTab: "overview" | "page" | "takedown";
  }
}

export default defineArea({
  id: "events",
  path: "/events",
  title: "Events",
  icon: "event",
  frame: "redrawn",
  roles: opsAndOwner,
  navigation: {
    owner: {order: 80, section: "Records"},
    sales: {order: 60, section: "Records"},
    ops: {order: 60, section: "Records"},
  },
  routeDefaults: {eventWorkspace: "directory", eventTab: "overview"},
  routes: [
    route("/events/*", "events"),
    route("/events/:eventId", "events", {title: "Event detail"}),
    route("/events/:eventId/page", "events", {title: "Event page", eventTab: "page"}),
    route("/events/external/:externalEventId/takedown", "events", {
      eventWorkspace: "external", eventTab: "takedown", title: "External event takedown",
    }),
    route("/events/external/*", "events", {eventWorkspace: "external", title: "External inventory"}),
    route("/events/external/:externalEventId", "events", {eventWorkspace: "external", title: "External event"}),
    // The retired readiness workspace: old links open the directory, not an event named "readiness".
    route("/events/readiness/*", "events"),
  ],
});
