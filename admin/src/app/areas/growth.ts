import {defineArea, owner, route} from "../adminAreaKit";

export type GrowthView = "cohorts" | "channels" | "nominators" | "best";

declare module "../adminAreaKit" {
  interface AdminNavIds {growth: true}
  interface AdminRouteFields {
    growthView: GrowthView;
  }
}

/** Growth's view, and one nominator in it. */
export function growthPath(view: GrowthView, nominatorUid: string | null = null): string {
  const base = view === "cohorts" ? "/growth" : `/growth/${view}`;
  return nominatorUid === null ? base : `${base}/${encodeURIComponent(nominatorUid)}`;
}

export default defineArea({
  id: "growth",
  path: "/growth",
  title: "Growth",
  icon: "trend",
  frame: "redrawn",
  roles: owner,
  navigation: {
    owner: {order: 100, section: "Insights"},
  },
  routeDefaults: {growthView: "cohorts"},
  routes: [
    route("/growth/*", "growth"),
    ...(["channels", "nominators", "best"] as const).map((growthView) => route(`/growth/${growthView}/*`, "growth", {growthView})),
    route("/growth/nominators/:nominatorUid", "growth", {growthView: "nominators", title: "Nominator"}),
    // The retired Growth signals: old links open Growth.
    route("/growth/signals/*", "growth", {redirect: "/growth"}),
  ],
});
