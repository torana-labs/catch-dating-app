import {defineArea, route} from "../adminAreaKit";

declare module "../adminAreaKit" {
  interface AdminNavIds {support: true}
  interface AdminRouteFields {
    supportWorkspace: "inbox" | "trial";
  }
}

export default defineArea({
  id: "support",
  path: "/support",
  title: "Support",
  icon: "support",
  frame: "redrawn",
  roles: ["adminOwner", "support"],
  navigation: {
    owner: {order: 40, section: "Work"},
    ops: {order: 40, section: "Work"},
  },
  routeDefaults: {supportWorkspace: "inbox"},
  routes: [
    route("/support/*", "support"),
    route("/support/:supportConversationId", "support", {title: "Support conversation"}),
    route("/support/trial/*", "support", {supportWorkspace: "trial", title: "WhatsApp reply trial"}),
  ],
});
