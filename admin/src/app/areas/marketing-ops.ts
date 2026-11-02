import {defineArea, opsAndOwner, route} from "../adminAreaKit";

export type MarketingTab = "posts" | "new" | "events" | "media" | "activity" |
  "diagnostics" | "draft";
export type MarketingStep = "source" | "copy" | "compliance" | "export";

declare module "../adminAreaKit" {
  interface AdminNavIds {"marketing-ops": true}
  interface AdminRouteFields {
    marketingTab: MarketingTab;
    composerStep: MarketingStep;
  }
}

export function marketingPathForTab(tab: Exclude<MarketingTab, "draft">): string {
  return `/marketing/${tab}`;
}

export default defineArea({
  id: "marketing-ops",
  path: "/marketing",
  title: "Marketing",
  icon: "announce",
  frame: "legacy",
  roles: opsAndOwner,
  routeDefaults: {marketingTab: "posts", composerStep: "source"},
  routes: [
    route("/marketing/*", "marketing-ops"),
    route("/marketing-ops/*", "marketing-ops"),
    ...(["posts", "new", "events", "media", "activity", "diagnostics"] as const)
      .map((marketingTab) => route(`/marketing/${marketingTab}/*`, "marketing-ops", {marketingTab})),
    route("/marketing/drafts/:draftId/*", "marketing-ops", {marketingTab: "draft", title: "Marketing draft"}),
    ...(["source", "copy", "compliance", "export"] as const).map((composerStep) =>
      route(`/marketing/drafts/:draftId/${composerStep}`, "marketing-ops", {
        marketingTab: "draft", composerStep, title: "Marketing draft",
      })),
  ],
});
