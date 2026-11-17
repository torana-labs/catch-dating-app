/**
 * Every page path of the website redesign (design/source_packs/website-playbook,
 * the sitemap board), registered before its content exists. A route renders
 * only once its page is in its section's index
 * (content/playbook/pages/<section>/index.ts); until then it is a clean 404.
 * design/website/routes.json lists the same routes as
 * `contentFamily` routes, and tool/marketing/check_website_routes.mjs keeps
 * the two equal.
 *
 * Pure data and matching only: the route checker and postbuild import this
 * module under Node, so it imports nothing.
 */

/**
 * The section a route's pages ship in: one content-only PR per section, each
 * owning content/playbook/pages/<section>/ and its index.
 */
export type PlaybookRouteGroup = "host" | "product" | "resources" | "discovery";

export interface PlaybookFixedRoute {
  readonly id: string;
  readonly group: PlaybookRouteGroup;
  readonly path: string;
}

/**
 * A family: one route, many pages. `pattern` names its parameters with
 * `:name`, and a parameter may share a segment with literal text
 * (`/new-to-:city/`). Each page of a family is registered by its instance key.
 */
export interface PlaybookFamilyRoute {
  readonly id: string;
  readonly group: PlaybookRouteGroup;
  readonly pattern: string;
  /** City families: the `city` parameter must be a market city slug. */
  readonly cityParam?: string;
}

export const playbookFixedRoutes = [
  {id: "host_run_clubs", group: "host", path: "/host/run-clubs/"},
  {id: "host_racket_sports", group: "host", path: "/host/racket-sports/"},
  {id: "host_supper_clubs", group: "host", path: "/host/supper-clubs/"},
  {id: "host_quiz_nights", group: "host", path: "/host/quiz-nights/"},
  {id: "host_venues", group: "host", path: "/host/venues/"},
  {id: "host_studios", group: "host", path: "/host/studios/"},
  {id: "host_nightlife", group: "host", path: "/host/nightlife/"},
  {id: "host_workshops", group: "host", path: "/host/workshops/"},
  {id: "host_communities", group: "host", path: "/host/communities/"},
  {id: "host_creators", group: "host", path: "/host/creators/"},
  {id: "host_teams", group: "host", path: "/host/teams/"},
  {id: "host_outdoors", group: "host", path: "/host/outdoors/"},
  {id: "host_facilities", group: "host", path: "/host/facilities/"},
  {id: "host_colleges", group: "host", path: "/host/colleges/"},
  {id: "host_brands", group: "host", path: "/host/brands/"},

  {id: "how_it_works", group: "product", path: "/how-it-works/"},
  {id: "product_night", group: "product", path: "/product/night/"},
  {id: "product_bookings", group: "product", path: "/product/bookings/"},
  {id: "product_your_page", group: "product", path: "/product/your-page/"},
  {id: "product_door", group: "product", path: "/product/door/"},
  {id: "product_messages", group: "product", path: "/product/messages/"},
  {id: "product_guests", group: "product", path: "/product/guests/"},
  {id: "product_forms", group: "product", path: "/product/forms/"},
  {id: "product_reports", group: "product", path: "/product/reports/"},

  {id: "pricing", group: "product", path: "/pricing/"},
  {id: "safety", group: "resources", path: "/safety/"},
  {id: "about", group: "resources", path: "/about/"},
  {id: "app_notify", group: "resources", path: "/app/"},

  {id: "host_start", group: "host", path: "/host/start/"},
  {id: "host_walkthrough", group: "host", path: "/host/walkthrough/"},
  {id: "host_demo", group: "resources", path: "/host/demo/"},
  {id: "host_first_event", group: "host", path: "/host/first-event/"},
  {id: "host_switch", group: "host", path: "/host/switch/"},
  {id: "programmes", group: "host", path: "/programmes/"},
  {id: "refer", group: "resources", path: "/refer/"},

  {id: "stories", group: "resources", path: "/stories/"},
  {id: "compare", group: "resources", path: "/compare/"},
  {id: "tools_no_show_calculator", group: "resources", path: "/tools/no-show-calculator/"},
  {id: "tools_event_page_from_link", group: "resources", path: "/tools/event-page-from-link/"},
  {id: "playbooks", group: "resources", path: "/playbooks/"},
] as const satisfies readonly PlaybookFixedRoute[];

/** Families, matched in this order after every fixed path; the two-segment city family comes last. */
export const playbookFamilyRoutes = [
  {id: "host_first_event_plan", group: "host", pattern: "/host/first-event/:plan/"},
  {id: "story_detail", group: "resources", pattern: "/stories/:slug/"},
  {id: "compare_detail", group: "resources", pattern: "/compare/:slug/"},
  {id: "playbook_guide", group: "resources", pattern: "/playbooks/:slug/"},
  {id: "lp_campaign", group: "resources", pattern: "/lp/:campaign/"},
  {id: "new_to_city", group: "discovery", pattern: "/new-to-:city/", cityParam: "city"},
  {id: "city_format", group: "discovery", pattern: "/:city/:format/", cityParam: "city"},
] as const satisfies readonly PlaybookFamilyRoute[];

/**
 * The existing site routes a playbook action or breadcrumb may name, with
 * the canonical path each links to. The route checker holds every entry to
 * design/website/routes.json.
 */
export const siteRouteHrefs = {
  home: "/",
  visitor_discovery: "/explore/",
  cities: "/cities/",
  host: "/host/",
  weddings: "/weddings/",
  weddings_apply: "/weddings/apply/",
  claim: "/claim/",
  privacy: "/privacy/",
  terms: "/terms/",
  help: "/help/",
  account_deletion: "/delete-account/",
  refunds: "/refunds/",
  contact: "/contact/",
} as const;

/** A path matched to a playbook route: the route, its parameters and the key its content is registered under. */
export interface PlaybookRouteMatch {
  readonly route: PlaybookFixedRoute | PlaybookFamilyRoute;
  readonly params: Readonly<Record<string, string>>;
  /** The route id for a fixed page; `<route id>/<param>/...` for a family page. */
  readonly contentKey: string;
  /** The page's canonical path, always with a trailing slash. */
  readonly canonicalPath: string;
}

/** The path with exactly one leading and one trailing slash. */
export function normalizePlaybookPath(pathname: string): string {
  const trimmed = pathname.split(/[?#]/u)[0].replace(/^\/+|\/+$/gu, "");
  return trimmed === "" ? "/" : `/${trimmed}/`;
}

const familyMatchers = playbookFamilyRoutes.map((route) => {
  const names: string[] = [];
  const source = route.pattern.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/:([a-zA-Z]+)/gu, (_match, name: string) => {
    names.push(name);
    return "([a-z0-9][a-z0-9-]*)";
  });
  return {route, names, regex: new RegExp(`^${source}$`, "u")};
});

/**
 * The playbook route a path names, or null. A match says nothing about
 * whether the page has content yet; ./playbookPages decides that.
 */
export function matchPlaybookRoute(pathname: string): PlaybookRouteMatch | null {
  const path = normalizePlaybookPath(pathname);
  const fixed = playbookFixedRoutes.find((route) => route.path === path);
  if (fixed) return {route: fixed, params: {}, contentKey: fixed.id, canonicalPath: fixed.path};
  for (const {route, names, regex} of familyMatchers) {
    const match = regex.exec(path);
    if (!match) continue;
    const values = match.slice(1);
    const params = Object.fromEntries(names.map((name, index) => [name, values[index]]));
    return {route, params, contentKey: [route.id, ...values].join("/"), canonicalPath: path};
  }
  return null;
}

/** The first path segment of a route as written: `host` for /host/run-clubs/, `new-to-` for /new-to-:city/. */
export function playbookTopSegment(route: PlaybookFixedRoute | PlaybookFamilyRoute): string {
  const pattern = "path" in route ? route.path : route.pattern;
  return pattern.split("/")[1].split(":")[0];
}

/** The path a content key is served at: a fixed route's path, or its family's pattern with the key's parameters. */
export function playbookPathForContentKey(contentKey: string): string | null {
  const [routeId, ...values] = contentKey.split("/");
  const fixed = playbookFixedRoutes.find((route) => route.id === routeId);
  if (fixed) return values.length === 0 ? fixed.path : null;
  const family = playbookFamilyRoutes.find((route) => route.id === routeId);
  if (!family) return null;
  const names = [...family.pattern.matchAll(/:([a-zA-Z]+)/gu)];
  if (names.length !== values.length) return null;
  let index = 0;
  return family.pattern.replace(/:([a-zA-Z]+)/gu, () => values[index++]);
}
