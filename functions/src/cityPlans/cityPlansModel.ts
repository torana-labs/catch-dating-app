import type {CityPlansDocument} from
  "../shared/generated/cityPlansDocument";
import type {
  OrganizerPublicPageDocument,
} from "../shared/generated/organizerPublicPageDocument";
import {
  isUpcoming,
  pageLimits,
  type PageEvent,
} from "../publicPages/pageModel";
import type {HostListing} from "../publicPages/publicOrganizer";
import {
  allowedOn,
  type DiscoveryRules,
  type DiscoverySurfaceRule,
} from "../discovery/discoveryPolicy";
import {
  discoveryFormats,
  discoveryFormatsForEvent,
  discoveryFormatsForText,
  discoveryFormatSlugs,
  formatPageIndexingFor,
  type DiscoveryFormat,
} from "./discoveryFormats";

/**
 * Assembles one city's plans read model. Pure: the caller reads the sources
 * and writes the result. Live cities are built only from organizer page read
 * models, which already passed every publication rule. The one rule this
 * module adds is the owner's Settings → Discovery, which can only hide: plans
 * come from organisers its plans rule allows, organisers from those its
 * homepage or city rule allows, and every count from those its totals rule
 * allows. It never shows an organiser a publication rule hides.
 *
 * Two windows: plans and the homepage format counts cover 14 days; the
 * header's 30-day signal and the city-by-format page counts cover 30, and
 * are counted before plans and organizers are capped.
 */
export type CityPlans = Omit<CityPlansDocument, "builtAt">;
export type CityPlan = CityPlans["plans"][number];
export type CityOrganizer = CityPlans["organizers"][number];
export type CityFormat = CityPlan["format"];
export type CityFormatPages = CityPlans["formatPages"];

/**
 * The fields of an organizer page a city reads. womenLed is the resolved
 * women-led label: pages built before it shipped omit it, and so may their
 * events; absence reads as false.
 */
export type CityOrganizerPage = Pick<OrganizerPublicPageDocument,
  "organizerId" | "path" | "identity" | "followerCount" | "claim"> & {
    upcomingEvents: readonly (PageEvent & WomenLed)[];
    womenLed?: boolean;
  };

interface WomenLed {
  womenLed?: boolean;
}

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
  /** Settings → Discovery, read once per rebuild. */
  discovery: DiscoveryRules;
}

export const cityPlanLimits = {
  windowDays: 14,
  monthWindowDays: 30,
  plans: 120,
  organizers: 24,
} as const;

export const cityFormats = ["run", "dinner", "games",
  "courts", "nightsOut", "other"] as const satisfies readonly CityFormat[];

/**
 * The activity kinds each format covers, as `formatActivityKinds` in
 * packages/web-ui/src/components/palette.ts draws them; a parity test holds
 * the two to the same map. Kinds not listed are `other`.
 */
export const formatActivityKinds: Readonly<
  Record<Exclude<CityFormat, "other">, readonly string[]>> = {
    run: ["socialRun", "running"],
    dinner: ["dinner"],
    games: ["pubQuiz"],
    courts: ["pickleball", "padel", "tennis", "badminton"],
    nightsOut: ["barCrawl"],
  };

export function formatForActivity(activityKind: string): CityFormat {
  return cityFormats.find((format) => format !== "other" &&
    formatActivityKinds[format].includes(activityKind)) ?? "other";
}

// Listed formats and categories are free text; quiz is tested before pub.
const formatPatterns: readonly [RegExp, CityFormat][] = [
  [/\b(quiz|trivia|game)/i, "games"],
  [/\b(run|jog)/i, "run"],
  [/\b(dinner|supper|food|table|brunch)/i, "dinner"],
  [/\b(pickle|padel|tennis|badminton)/i, "courts"],
  [/\b(bar|crawl|pub|night)/i, "nightsOut"],
];

export function formatsForText(text: string): CityFormat[] {
  return formatPatterns.flatMap(([pattern, format]) =>
    pattern.test(text) ? [format] : []);
}

const day = 24 * 60 * 60 * 1000;

export function buildCityPlans(sources: CityPlanSources): CityPlans {
  const {market, now, discovery} = sources;
  const {surfaces} = discovery;
  const windowEnd = now + cityPlanLimits.windowDays * day;
  const monthWindowEnd = now + cityPlanLimits.monthWindowDays * day;
  const launched = market.launchStatus === "launched";
  const pages = launched ? [...sources.organizerPages]
    .filter((page) => page.identity.citySlug === market.slug)
    .sort((a, b) => compare(a.organizerId, b.organizerId)) : [];
  const joining = launched ? [] : [...sources.joiningOrganizers]
    .filter((listing) => listing.citySlug === market.slug);

  const pageFormats = new Map(pages.map((page) =>
    [page.organizerId, discoveryFormatsForText(listedFormats(page))]));
  const plans = pages.filter((page) => allowedOn(surfaces.plans,
    page.claim.state)).flatMap((page) => page.upcomingEvents
    .filter((item) => isUpcoming(item, now) && start(item) < windowEnd)
    .map((item) => cityPlan(item, page,
      pageFormats.get(page.organizerId) ?? [])))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) ||
      compare(a.eventId, b.eventId));

  const formatCounts = Object.fromEntries(cityFormats.map((format) =>
    [format, 0])) as CityPlans["formatCounts"];
  for (const plan of plans) formatCounts[plan.format]++;
  const womenLedPlanCount = plans.filter((plan) => plan.womenLed).length;

  const month = monthCounts(pages, pageFormats, joining, now,
    monthWindowEnd, surfaces.totals);
  const listed = (claimState: unknown) =>
    allowedOn(surfaces.homeOrganizers, claimState) ||
    allowedOn(surfaces.cityOrganizers, claimState);
  const organizers = launched ?
    pages.filter((page) => listed(page.claim.state))
      .map((page) => pageOrganizer(page, plans,
        month.organizerFormats.get(page.organizerId) ?? [])) :
    joining.filter((listing) => listed(listing.authority.claimState))
      .map(joiningOrganizer);

  return {
    schemaVersion: 1,
    citySlug: market.slug,
    cityLabel: market.label,
    marketStatus: market.launchStatus,
    // A launched city is open however few plans it has; the page shows the
    // honest count. Only a city that has not launched reads as launching.
    status: launched ? "live" : "launchingSoon",
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    planCount: plans.length,
    formatCounts,
    womenLedPlanCount,
    monthWindowEnd: new Date(monthWindowEnd).toISOString(),
    upcomingEvents30d: month.eventCount,
    hasUpcomingMonth: month.eventCount > 0,
    monthCountsComplete: month.complete,
    formatPages: month.formatPages,
    plans: plans.slice(0, cityPlanLimits.plans),
    organizers: organizers.sort(byNextPlanThenFollowers)
      .slice(0, cityPlanLimits.organizers),
    discovery: {
      homeOrganizers: {...surfaces.homeOrganizers},
      cityOrganizers: {...surfaces.cityOrganizers},
      homeOrganizersMinimum: discovery.homeOrganizersMinimum,
      homeClaimAction: discovery.homeClaimAction,
    },
  };
}

interface MonthCounts {
  eventCount: number;
  complete: boolean;
  formatPages: CityFormatPages;
  organizerFormats: ReadonlyMap<string, DiscoveryFormat[]>;
}

/**
 * The 30-day signal and the city-by-format page counts. Every page in the
 * city that the totals rule allows counts, however many organizers and plans
 * the document lists. A city that has not launched has no pages, so it counts
 * no plans; its organisers are the published organisers joining it that the
 * totals rule allows, each counted once per format its listing names. Every
 * page's formats are worked out, counted or not, because a listed organiser
 * carries them.
 */
function monthCounts(
  pages: readonly CityOrganizerPage[],
  pageFormats: ReadonlyMap<string, readonly DiscoveryFormat[]>,
  joining: readonly HostListing[],
  now: number, monthWindowEnd: number,
  totals: DiscoverySurfaceRule
): MonthCounts {
  const organizers = new Map<DiscoveryFormat, Set<string>>();
  const events = new Map<DiscoveryFormat, Set<string>>();
  const free = new Map<DiscoveryFormat, Set<string>>();
  const add = (counts: Map<DiscoveryFormat, Set<string>>,
    format: DiscoveryFormat, id: string) => {
    const ids = counts.get(format) ?? new Set<string>();
    ids.add(id);
    counts.set(format, ids);
  };
  const monthEvents = new Set<string>();
  const organizerFormats = new Map<string, DiscoveryFormat[]>();
  let complete = true;

  for (const page of pages) {
    const counted = allowedOn(totals, page.claim.state);
    const listed = pageFormats.get(page.organizerId) ?? [];
    const runs = new Set<DiscoveryFormat>(listed);
    const upcoming = page.upcomingEvents.filter((item) =>
      isUpcoming(item, now));
    for (const item of upcoming) {
      const formats = discoveryFormatsForEvent(item.event.activityKind,
        listed);
      for (const format of formats) runs.add(format);
      if (!counted || start(item) >= monthWindowEnd) continue;
      monthEvents.add(item.eventId);
      for (const format of formats) {
        add(events, format, item.eventId);
        if (isFree(item)) add(free, format, item.eventId);
      }
    }
    const formats = discoveryFormats.filter((format) => runs.has(format));
    organizerFormats.set(page.organizerId, formats);
    if (!counted) continue;
    // A full list may stop short of plans still inside the window.
    const last = page.upcomingEvents[page.upcomingEvents.length - 1];
    if (page.upcomingEvents.length >= pageLimits.upcomingEvents && last &&
        start(last) < monthWindowEnd) complete = false;
    for (const format of formats) add(organizers, format, page.organizerId);
  }
  for (const listing of joining) {
    if (!allowedOn(totals, listing.authority.claimState)) continue;
    for (const format of discoveryFormatsForText(
      [listing.category, ...listing.formats])) {
      add(organizers, format, listing.id);
    }
  }

  const formatPages = Object.fromEntries(discoveryFormats.map((format) => {
    const organizerCount = organizers.get(format)?.size ?? 0;
    const upcomingEventCount = events.get(format)?.size ?? 0;
    return [format, {
      slug: discoveryFormatSlugs[format],
      organizerCount,
      upcomingEventCount,
      freeEventCount: free.get(format)?.size ?? 0,
      indexing: formatPageIndexingFor(organizerCount, upcomingEventCount),
    }];
  })) as CityFormatPages;
  return {eventCount: monthEvents.size, complete, formatPages,
    organizerFormats};
}

// "Free", or a zero amount in rupees: "0 INR", "INR 0", "₹0", "Rs. 0".
const rupees = String.raw`(?:₹|rs\.?|inr)`;
const zero = String.raw`0+(?:\.0+)?`;
const freePriceLabel = new RegExp(
  String.raw`^\s*(?:free|${rupees}\s*${zero}|${zero}\s*${rupees})\s*$`, "iu");

/**
 * A plan is free when a guest pays nothing to book it: a Catch plan priced
 * at zero, unless the host hides its price until booking opens, or an
 * imported plan whose source lists its price as Free or as zero rupees. A
 * hidden price is never counted, so the count cannot reveal it.
 */
export function isFree(item: PageEvent): boolean {
  const freeLabel = freePriceLabel.test(item.event.priceLabel);
  if (item.source === "external") return freeLabel;
  if (item.event.priceHidden === true) return false;
  return typeof item.event.amountPaise === "number" ?
    item.event.amountPaise === 0 : freeLabel;
}

/** The free text an organizer page lists its formats in. */
function listedFormats(page: CityOrganizerPage): string[] {
  return [page.identity.category, ...page.identity.formats];
}

function cityPlan(item: PageEvent & WomenLed, page: CityOrganizerPage,
  organizerFormats: readonly DiscoveryFormat[]): CityPlan {
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
    discoveryFormats: discoveryFormatsForEvent(event.activityKind,
      organizerFormats),
    womenLed: item.womenLed === true,
  };
}

function pageOrganizer(
  page: CityOrganizerPage, plans: readonly CityPlan[],
  formats: DiscoveryFormat[]
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
    discoveryFormats: formats,
    womenLed: page.womenLed === true,
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
    discoveryFormats: discoveryFormatsForText(
      [listing.category, ...listing.formats]),
    // A city that has not launched lists organisers without their page, so
    // their women-led label is not shown until it launches.
    womenLed: false,
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
