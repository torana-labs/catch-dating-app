import {matchPath, matchRoutes, type NonIndexRouteObject} from "react-router";

// The route table. Every Admin area registers its destination here and its
// navigation item and screen in adminAreas.tsx.
export const adminSections = {
  now: {path: "/now", title: "Needs you"},
  support: {path: "/support", title: "Support"},
  marketplace: {path: "/marketplace", title: "Marketplace"},
  more: {path: "/more", title: "More"},
  system: {path: "/system", title: "System"},
  safety: {path: "/safety", title: "Safety"},
  growth: {path: "/growth", title: "Growth"},
  "marketing-ops": {path: "/marketing", title: "Marketing"},
  sales: {path: "/sales/today", title: "Sales"},
  "sales-hosts": {path: "/sales/hosts", title: "Hosts"},
  "sales-deals": {path: "/sales/deals", title: "Deals"},
  nominations: {path: "/sales/nominations", title: "My nominations"},
  "organizer-intake": {path: "/inbox", title: "Inbox"},
  // The listing, event and policy review the inbox links to until each moves into it.
  "intake-review": {path: "/intake/organizers", title: "Intake review"},
  organizers: {path: "/organizers", title: "Organizers"},
  events: {path: "/events", title: "Events"},
  people: {path: "/people", title: "People"},
  users: {path: "/users", title: "User analytics"},
  money: {path: "/money", title: "Money"},
  "payment-setup": {path: "/payment-setup", title: "Payment setup"},
  quality: {path: "/quality", title: "Data quality"},
  operations: {path: "/operations", title: "Agent activity"},
  settings: {path: "/settings", title: "Settings"},
} as const;

export type AdminNavId = keyof typeof adminSections;
type MarketingTab = "posts" | "new" | "events" | "media" | "activity" |
  "diagnostics" | "draft";
type MarketingStep = "source" | "copy" | "compliance" | "export";
export type FinanceWorkspace = "issues" | "commercial-terms" | "payment-routing";
export type MoneyView = "issues" | "resolved" | "bills";

interface RouteState {
  nav: AdminNavId | null;
  /** An old address: the shell replaces it with this path. */
  redirect?: string;
  title?: string;
  salesArea?: "today" | "settings" | "pipeline" | "pilots" | "research";
  organizerWorkspace?: "directory" | "claims";
  eventWorkspace?: "directory" | "external";
  eventTab?: "overview" | "page" | "takedown";
  organizerTab?: "overview" | "page" | "events" | "sales" | "money" | "history";
  financeWorkspace?: FinanceWorkspace;
  supportWorkspace?: "inbox" | "trial";
  safetyView?: "open" | "actions" | "appeals";
  moneyView?: MoneyView;
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
  // The Cross Paths page is retired; old links land on Needs you.
  route("/cross-paths/*", "now", {redirect: "/now"}),
  ...Object.entries(adminSections).filter(([nav]) => !["intake-review", "sales-hosts", "sales-deals", "nominations"].includes(nav)).map(([nav, {path}]) => route(
    `/${path.split("/")[1]}/*`, nav as AdminNavId
  )),
  route("/marketing-ops/*", "marketing-ops"),
  route("/organizer-intake/*", "intake-review", {title: "Organizer intake"}),
  route("/inbox/:inboxItemId", "organizer-intake", {title: "Inbox item"}),
  route("/safety/:targetPath", "safety", {title: "Safety case"}),
  route("/support/:supportConversationId", "support", {title: "Support conversation"}),
  route("/support/trial/*", "support", {supportWorkspace: "trial", title: "WhatsApp reply trial"}),
  route("/safety/actions/*", "safety", {safetyView: "actions", title: "Account actions"}),
  route("/safety/actions/:safetyActionId", "safety", {safetyView: "actions", title: "Account action"}),
  route("/safety/appeals/*", "safety", {safetyView: "appeals", title: "Appeals"}),
  route("/safety/appeals/:safetyActionId", "safety", {safetyView: "appeals", title: "Appeal"}),
  // Launch access moved into the Safety queue.
  route("/access/*", "safety", {redirect: "/safety"}),
  route("/organizers/:organizerId", "organizers"),
  ...(["page", "events", "sales", "money", "history"] as const).map((organizerTab) =>
    route(`/organizers/:organizerId/${organizerTab}`, "organizers", {organizerTab})),
  route("/organizers/claims/*", "organizers", {organizerWorkspace: "claims"}),
  route("/organizers/claims/:claimRequestId", "organizers", {organizerWorkspace: "claims"}),
  route("/events/:eventId", "events", {title: "Event detail"}),
  route("/events/:eventId/page", "events", {title: "Event page", eventTab: "page"}),
  route("/events/external/:externalEventId/takedown", "events", {
    eventWorkspace: "external", eventTab: "takedown", title: "External event takedown",
  }),
  route("/events/external/*", "events", {eventWorkspace: "external", title: "External inventory"}),
  route("/events/external/:externalEventId", "events", {eventWorkspace: "external", title: "External event"}),
  // The retired readiness workspace: old links open the directory, not an event named "readiness".
  route("/events/readiness/*", "events"),
  route("/growth/signals/:growthSignalId", "growth", {title: "Growth signal"}),
  route("/money/resolved/*", "money", {moneyView: "resolved"}),
  route("/money/resolved/:moneyIssueId", "money", {moneyView: "resolved", title: "Resolved payment issue"}),
  route("/money/issues/:moneyIssueId", "money", {title: "Payment issue"}),
  route("/money/bills/*", "money", {moneyView: "bills", title: "Bills"}),
  route("/money/bills/:billId", "money", {moneyView: "bills", title: "Bill"}),
  // The older payment setup screens moved off /finance; old links keep working.
  route("/finance/*", "money", {redirect: "/money"}),
  route("/finance/commercial-terms/*", "payment-setup", {redirect: "/payment-setup/commercial-terms"}),
  route("/finance/payment-routing/*", "payment-setup", {redirect: "/payment-setup/payment-routing"}),
  route("/payment-setup/issues/:financeIssueId", "payment-setup", {title: "Finance issue"}),
  route("/payment-setup/commercial-terms/*", "payment-setup", {financeWorkspace: "commercial-terms", title: "Commercial terms"}),
  route("/payment-setup/commercial-terms/organizers/:termsOrganizerId", "payment-setup", {
    financeWorkspace: "commercial-terms", title: "Organizer commercial terms",
  }),
  route("/payment-setup/payment-routing/*", "payment-setup", {financeWorkspace: "payment-routing", title: "Payment routing"}),
  route("/quality/signals/:qualitySignalId", "quality", {title: "Data quality signal"}),
  route("/settings/:settingsPage", "settings"),
  route("/settings/team/:teamMemberUid", "settings", {title: "Team and roles"}),
  // Admin roles became Settings → Team and roles.
  route("/admin-roles/*", "settings", {redirect: "/settings/team"}),
  route("/sales/today/*", "sales", {salesArea: "today"}),
  route("/sales/today/:salesTaskId", "sales", {salesArea: "today", title: "Task"}),
  route("/sales/settings/*", "sales", {salesArea: "settings", title: "Sales settings"}),
  route("/sales/hosts/*", "sales-hosts"),
  route("/sales/hosts/:salesOrganizerId", "sales-hosts", {title: "Host"}),
  route("/sales/deals/*", "sales-deals"),
  route("/sales/nominations/*", "nominations"),
  route("/sales/nominations/:nominationItemId", "nominations", {title: "Nomination"}),
  // The older Sales pages keep the tools the new screens don't have yet: stage moves,
  // pilot plans and quotes. Each goes when its replacement lands.
  ...(["pipeline", "pilots", "research"] as const).map((salesArea) =>
    route(`/sales/${salesArea}/*`, "sales", {salesArea, title: "Older Sales page"})),
  route("/intake/*", "intake-review", {title: "Organizer intake"}),
  route("/intake/events/*", "intake-review", {title: "Event intake"}),
  route("/intake/operations/*", "intake-review", {title: "Supply intake operations"}),
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
    eventTab: state?.eventTab ?? "overview",
    organizerTab: state?.organizerTab ?? "overview",
    financeWorkspace: state?.financeWorkspace ?? "issues",
    supportWorkspace: state?.supportWorkspace ?? "inbox",
    safetyView: state?.safetyView ?? "open",
    moneyView: state?.moneyView ?? "issues",
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
  return workspace === "issues" ? adminSections["payment-setup"].path : `/payment-setup/${workspace}`;
}

/** Money's view, and one issue or bill in it. */
export function moneyPath(view: MoneyView, id: string | null = null): string {
  const base = view === "issues" ? adminSections.money.path : `${adminSections.money.path}/${view}`;
  if (id === null) return base;
  return `${view === "issues" ? `${base}/issues` : base}/${encodeURIComponent(id)}`;
}

export function commercialTermsPathForOrganizer(organizerId: string | null): string {
  return organizerId === null ? financePathForWorkspace("commercial-terms") :
    `/payment-setup/commercial-terms/organizers/${encodeURIComponent(organizerId)}`;
}
