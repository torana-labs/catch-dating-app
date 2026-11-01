import {matchPath, matchRoutes, type NonIndexRouteObject} from "react-router";

// The route table. Every Admin area registers its destination here and its
// navigation item and screen in adminAreas.tsx.
export const adminSections = {
  now: {path: "/now", title: "Needs you"},
  support: {path: "/support", title: "Support"},
  marketplace: {path: "/marketplace", title: "Marketplace"},
  more: {path: "/more", title: "More"},
  safety: {path: "/safety", title: "Safety"},
  "cross-paths": {path: "/cross-paths", title: "Cross Paths showcase"},
  growth: {path: "/growth", title: "Growth"},
  "marketing-ops": {path: "/marketing", title: "Marketing"},
  sales: {path: "/sales/today", title: "Sales"},
  "organizer-intake": {path: "/intake/organizers", title: "Intake"},
  organizers: {path: "/organizers", title: "Organizers"},
  events: {path: "/events", title: "Events"},
  people: {path: "/people", title: "People"},
  users: {path: "/users", title: "User analytics"},
  finance: {path: "/finance", title: "Finance"},
  quality: {path: "/quality", title: "Data quality"},
  operations: {path: "/operations", title: "Agent activity"},
  settings: {path: "/settings", title: "Settings"},
} as const;

export type AdminNavId = keyof typeof adminSections;
type MarketingTab = "posts" | "new" | "events" | "media" | "activity" |
  "diagnostics" | "draft";
type MarketingStep = "source" | "copy" | "compliance" | "export";
export type FinanceWorkspace = "issues" | "commercial-terms" | "payment-routing";

interface RouteState {
  nav: AdminNavId | null;
  /** An old address: the shell replaces it with this path. */
  redirect?: string;
  title?: string;
  salesArea?: "today" | "hosts" | "pipeline" | "research" | "pilots" | "settings";
  organizerWorkspace?: "directory" | "claims";
  eventWorkspace?: "directory" | "external";
  financeWorkspace?: FinanceWorkspace;
  safetyView?: "open" | "actions" | "appeals";
  marketingTab?: MarketingTab;
  composerStep?: MarketingStep;
}

type AdminRoute = Omit<NonIndexRouteObject, "handle"> & {handle: RouteState};
function route(path: string, nav: AdminNavId, state: Omit<RouteState, "nav"> = {}): AdminRoute {
  return {path, caseSensitive: true, handle: {nav, ...state}};
}

// React Router ranks static workspace names ahead of dynamic record IDs.
// Workspace fallbacks retain existing links without selecting an unrelated record.
export const adminRoutes: AdminRoute[] = [
  route("/", "now", {redirect: "/now"}),
  // Overview split in two: its queues are Needs you, its analytics Marketplace.
  route("/overview/*", "now", {redirect: "/now"}),
  ...Object.entries(adminSections).filter(([nav]) => nav !== "organizer-intake").map(([nav, {path}]) => route(
    `/${path.split("/")[1]}/*`, nav as AdminNavId
  )),
  route("/marketing-ops/*", "marketing-ops"),
  route("/organizer-intake/*", "organizer-intake", {title: "Organizer intake"}),
  route("/safety/:targetPath", "safety", {title: "Safety case"}),
  route("/safety/actions/*", "safety", {safetyView: "actions", title: "Account actions"}),
  route("/safety/actions/:safetyActionId", "safety", {safetyView: "actions", title: "Account action"}),
  route("/safety/appeals/*", "safety", {safetyView: "appeals", title: "Appeals"}),
  route("/safety/appeals/:safetyActionId", "safety", {safetyView: "appeals", title: "Appeal"}),
  // Launch access moved into the Safety queue.
  route("/access/*", "safety", {redirect: "/safety"}),
  route("/organizers/:organizerId", "organizers"),
  route("/organizers/claims/*", "organizers", {organizerWorkspace: "claims"}),
  route("/organizers/claims/:claimRequestId", "organizers", {organizerWorkspace: "claims"}),
  route("/events/:eventId", "events", {title: "Event detail"}),
  route("/events/external/*", "events", {eventWorkspace: "external", title: "External inventory"}),
  route("/events/external/:externalEventId", "events", {eventWorkspace: "external", title: "External event"}),
  // The retired readiness workspace: old links open the directory, not an event named "readiness".
  route("/events/readiness/*", "events"),
  route("/growth/signals/:growthSignalId", "growth", {title: "Growth signal"}),
  route("/finance/issues/:financeIssueId", "finance", {title: "Finance issue"}),
  route("/finance/commercial-terms/*", "finance", {financeWorkspace: "commercial-terms", title: "Commercial terms"}),
  route("/finance/commercial-terms/organizers/:termsOrganizerId", "finance", {
    financeWorkspace: "commercial-terms", title: "Organizer commercial terms",
  }),
  route("/finance/payment-routing/*", "finance", {financeWorkspace: "payment-routing", title: "Payment routing"}),
  route("/quality/signals/:qualitySignalId", "quality", {title: "Data quality signal"}),
  route("/settings/:settingsPage", "settings"),
  route("/settings/team/:teamMemberUid", "settings", {title: "Team and roles"}),
  // Admin roles became Settings → Team and roles.
  route("/admin-roles/*", "settings", {redirect: "/settings/team"}),
  ...(["today", "hosts", "pipeline", "research", "pilots", "settings"] as const)
    .map((salesArea) => route(`/sales/${salesArea}/*`, "sales", {salesArea})),
  route("/sales/hosts/:salesOrganizerId", "sales", {salesArea: "hosts"}),
  route("/intake/*", "organizer-intake", {title: "Organizer intake"}),
  route("/intake/events/*", "organizer-intake", {title: "Event intake"}),
  route("/intake/operations/*", "organizer-intake", {title: "Supply intake operations"}),
  ...(["posts", "new", "events", "media", "activity", "diagnostics"] as const)
    .map((marketingTab) => route(`/marketing/${marketingTab}/*`, "marketing-ops", {marketingTab})),
  route("/marketing/drafts/:draftId/*", "marketing-ops", {marketingTab: "draft", title: "Marketing draft"}),
  ...(["source", "copy", "compliance", "export"] as const).map((composerStep) =>
    route(`/marketing/drafts/:draftId/${composerStep}`, "marketing-ops", {
      marketingTab: "draft", composerStep, title: "Marketing draft",
    })),
  {path: "*", handle: {nav: null}},
];

export function resolveAdminRoute(pathname: string) {
  const match = matchRoutes(adminRoutes, {pathname})?.at(-1);
  const state = match?.route.handle;
  // matchRoutes decodes a path before matching, including an additional %2F
  // replacement. Read parameters from the original path to preserve literal
  // percent-encoded text in opaque IDs (e.g. an ID containing "%2F").
  const rawParams = match?.route.path ? matchPath({
    path: match.route.path, caseSensitive: true,
  }, pathname)?.params ?? {} : {};
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => {
    try { return [key, value === undefined ? undefined : decodeURIComponent(value)]; }
    catch { return [key, value]; }
  }));
  return {
    nav: state?.nav ?? null,
    redirect: state?.redirect ?? null,
    title: state?.title,
    params,
    salesArea: state?.salesArea ?? "today",
    organizerWorkspace: state?.organizerWorkspace ?? "directory",
    eventWorkspace: state?.eventWorkspace ?? "directory",
    financeWorkspace: state?.financeWorkspace ?? "issues",
    safetyView: state?.safetyView ?? "open",
    marketingTab: state?.marketingTab ?? "posts",
    composerStep: state?.composerStep ?? "source",
  };
}

export function adminPathForNav(nav: AdminNavId): string {
  return adminSections[nav].path;
}

export function marketingPathForTab(tab: Exclude<MarketingTab, "draft">): string {
  return `/marketing/${tab}`;
}

export function financePathForWorkspace(workspace: FinanceWorkspace): string {
  return workspace === "issues" ? adminSections.finance.path : `/finance/${workspace}`;
}

export function commercialTermsPathForOrganizer(organizerId: string | null): string {
  return organizerId === null ? financePathForWorkspace("commercial-terms") :
    `/finance/commercial-terms/organizers/${encodeURIComponent(organizerId)}`;
}
