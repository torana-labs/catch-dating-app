import type {CityPlansDocument} from
  "../shared/generated/cityPlansDocument";
import type {
  OrganizerPublicPageDocument,
} from "../shared/generated/organizerPublicPageDocument";
import {isUpcoming, type PageEvent} from "../publicPages/pageModel";
import type {HostListing} from "../publicPages/publicOrganizer";

/**
 * Assembles one city's plans read model. Pure: the caller reads the sources
 * and writes the result. Live cities are built only from organizer page read
 * models, which already passed every publication rule, so this module adds
 * no visibility logic; it picks the plans in the window and counts them.
 */
export type CityPlans = Omit<CityPlansDocument, "builtAt">;
export type CityPlan = CityPlans["plans"][number];
export type CityOrganizer = CityPlans["organizers"][number];
export type CityFormat = CityPlan["format"];

/** The fields of an organizer page a city reads. */
export type CityOrganizerPage = Pick<OrganizerPublicPageDocument,
  "organizerId" | "path" | "identity" | "upcomingEvents" | "followerCount" |
  "claim">;

export interface CityMarket {
  slug: string;
  label: string;
  launchStatus: CityPlans["marketStatus"];
}

export interface CityPlanSources {
  market: CityMarket;
  now: number;
  /** Organizer pages in the city; a city that has not launched has none. */
  organizerPages: readonly CityOrganizerPage[];
  /**
   * Published organizers in a city that has not launched. They have no
   * public page until the city launches, so they carry no path.
   */
  joiningOrganizers: readonly HostListing[];
}

export const cityPlanLimits = {
  windowDays: 14,
  plans: 120,
  organizers: 24,
  /** A launched city with fewer plans than this reads as launching soon. */
  livePlanMinimum: 4,
} as const;

export const cityFormats = ["runClubs", "dinners", "gamesAndQuizzes",
  "pickleball", "nightsOut", "other"] as const satisfies readonly CityFormat[];

const formatByActivity: Readonly<Record<string, CityFormat>> = {
  socialRun: "runClubs",
  running: "runClubs",
  walking: "runClubs",
  dinner: "dinners",
  pubQuiz: "gamesAndQuizzes",
  pickleball: "pickleball",
  padel: "pickleball",
  barCrawl: "nightsOut",
};

export function formatForActivity(activityKind: string): CityFormat {
  return formatByActivity[activityKind] ?? "other";
}

// Listed formats and categories are free text; quiz is tested before pub.
const formatPatterns: readonly [RegExp, CityFormat][] = [
  [/\b(quiz|trivia|game)/i, "gamesAndQuizzes"],
  [/\b(run|walk|jog)/i, "runClubs"],
  [/\b(dinner|supper|food|table|brunch)/i, "dinners"],
  [/\b(pickle|padel)/i, "pickleball"],
  [/\b(bar|crawl|pub|night)/i, "nightsOut"],
];

export function formatsForText(text: string): CityFormat[] {
  return formatPatterns.flatMap(([pattern, format]) =>
    pattern.test(text) ? [format] : []);
}

const day = 24 * 60 * 60 * 1000;

export function buildCityPlans(sources: CityPlanSources): CityPlans {
  const {market, now} = sources;
  const windowEnd = now + cityPlanLimits.windowDays * day;
  const launched = market.launchStatus === "launched";
  const pages = launched ? [...sources.organizerPages]
    .filter((page) => page.identity.citySlug === market.slug)
    .sort((a, b) => compare(a.organizerId, b.organizerId)) : [];

  const plans = pages.flatMap((page) => page.upcomingEvents
    .filter((item) => isUpcoming(item, now) && start(item) < windowEnd)
    .map((item) => cityPlan(item, page)))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) ||
      compare(a.eventId, b.eventId));

  const formatCounts = Object.fromEntries(cityFormats.map((format) =>
    [format, 0])) as CityPlans["formatCounts"];
  for (const plan of plans) formatCounts[plan.format]++;

  const organizers = launched ?
    pages.map((page) => pageOrganizer(page, plans)) :
    [...sources.joiningOrganizers]
      .filter((listing) => listing.citySlug === market.slug)
      .map(joiningOrganizer);

  return {
    schemaVersion: 1,
    citySlug: market.slug,
    cityLabel: market.label,
    marketStatus: market.launchStatus,
    status: launched && plans.length >= cityPlanLimits.livePlanMinimum ?
      "live" : "launchingSoon",
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    planCount: plans.length,
    formatCounts,
    plans: plans.slice(0, cityPlanLimits.plans),
    organizers: organizers.sort(byNextPlanThenFollowers)
      .slice(0, cityPlanLimits.organizers),
  };
}

function cityPlan(item: PageEvent, page: CityOrganizerPage): CityPlan {
  const {event} = item;
  return {
    source: item.source,
    eventId: item.eventId,
    path: item.path,
    title: event.title,
    format: formatForActivity(event.activityKind),
    activityKind: event.activityKind,
    startTime: event.startTime,
    endTime: event.endTime,
    date: event.date,
    location: event.location,
    priceLabel: event.priceLabel,
    photoUrl: item.source === "catch" ? item.event.photoUrl ?? null : null,
    spotsLeft: item.booking.kind === "catch" ? item.booking.spotsLeft : null,
    organizer: {
      organizerId: page.organizerId,
      name: page.identity.name,
      path: page.path,
    },
  };
}

function pageOrganizer(
  page: CityOrganizerPage, plans: readonly CityPlan[]
): CityOrganizer {
  const own = plans.filter((plan) =>
    plan.organizer.organizerId === page.organizerId);
  const next = own[0];
  return {
    organizerId: page.organizerId,
    name: page.identity.name,
    path: page.path,
    category: page.identity.category,
    logo: page.identity.logo,
    formats: organizerFormats(own.map((plan) => plan.format),
      [page.identity.category, ...page.identity.formats]),
    followerCount: page.followerCount,
    claimState: page.claim.state,
    upcomingPlanCount: own.length,
    nextPlan: next ? {eventId: next.eventId, path: next.path,
      title: next.title, startTime: next.startTime, date: next.date} : null,
  };
}

function joiningOrganizer(listing: HostListing): CityOrganizer {
  return {
    organizerId: listing.id,
    name: listing.name,
    path: null,
    category: listing.category,
    logo: listing.logo,
    formats: organizerFormats([], [listing.category, ...listing.formats]),
    followerCount: listing.metrics?.followerCount ?? 0,
    claimState: listing.authority.claimState as CityOrganizer["claimState"],
    upcomingPlanCount: 0,
    nextPlan: null,
  };
}

/** Plan formats first, then any the listing names, in format order. */
function organizerFormats(
  fromPlans: readonly CityFormat[], text: readonly string[]
): CityFormat[] {
  const found = new Set([...fromPlans,
    ...text.flatMap((item) => formatsForText(item))]);
  return cityFormats.filter((format) => found.has(format));
}

function byNextPlanThenFollowers(a: CityOrganizer, b: CityOrganizer) {
  const nextA = a.nextPlan ? Date.parse(a.nextPlan.startTime) : Infinity;
  const nextB = b.nextPlan ? Date.parse(b.nextPlan.startTime) : Infinity;
  if (nextA !== nextB) return nextA - nextB;
  return b.followerCount - a.followerCount ||
    compare(a.organizerId, b.organizerId);
}

function start(item: PageEvent): number {
  return Date.parse(item.event.startTime);
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
