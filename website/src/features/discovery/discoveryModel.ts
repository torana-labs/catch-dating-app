import {discoveryFormatCopy} from "@content/discovery/discoveryFormats";
import {websiteCities} from "@content/markets";
import type {HomeCatalog, HomeCityPlans, HomePlan} from "../home/homeTypes";
import {upcomingPlans, weekPlans} from "../home/homeModel";
import {
  discoveryFormatKeys,
  discoveryFormatSlugs,
  type DiscoveryCityPlans,
  type DiscoveryFormatKey,
  type DiscoveryFormatPage,
  type DiscoveryFormatSlug,
  type DiscoveryOrganizer,
  type DiscoveryPlan,
} from "./discoveryTypes";

/** The discovery page a path names: a city-by-format page or a new-to-the-city page. Null for any other path. */
export type DiscoveryRoute =
  | {kind: "cityFormat"; citySlug: string; format: DiscoveryFormatKey; canonicalPath: string}
  | {kind: "newToCity"; citySlug: string; canonicalPath: string};

const citySlugs = new Set(websiteCities.map((city) => city.slug));

/** The format a URL segment names, from the backend's taxonomy, or null. */
export function discoveryFormatForSlug(slug: string): DiscoveryFormatKey | null {
  const index = (discoveryFormatSlugs as readonly string[]).indexOf(slug);
  return index >= 0 ? discoveryFormatKeys[index] : null;
}

/** A format's URL segment. */
export function discoverySlugForFormat(format: DiscoveryFormatKey): DiscoveryFormatSlug {
  return discoveryFormatSlugs[discoveryFormatKeys.indexOf(format)];
}

export const cityFormatPath = (citySlug: string, format: DiscoveryFormatKey) =>
  ["", encodeURIComponent(citySlug), discoverySlugForFormat(format), ""].join("/");
const newToPrefix = "new-to-";
export const newToCityPath = (citySlug: string) => ["", newToPrefix + encodeURIComponent(citySlug), ""].join("/");

/**
 * The discovery page a path names. The city must be a website city and the
 * format one of the backend's format page slugs; anything else is not a
 * discovery page (the router 404s it or tries its other routes). Pure, so
 * the router and the server can decide before reading anything.
 */
export function matchDiscoveryRoute(pathname: string): DiscoveryRoute | null {
  const segments = pathname.split(/[?#]/u)[0].split("/").filter(Boolean);
  if (segments.length === 1 && segments[0].startsWith(newToPrefix)) {
    const citySlug = segments[0].slice(newToPrefix.length);
    return citySlugs.has(citySlug) ? {kind: "newToCity", citySlug, canonicalPath: newToCityPath(citySlug)} : null;
  }
  if (segments.length === 2 && citySlugs.has(segments[0])) {
    const format = discoveryFormatForSlug(segments[1]);
    return format ? {kind: "cityFormat", citySlug: segments[0], format, canonicalPath: cityFormatPath(segments[0], format)} : null;
  }
  return null;
}

/** The selected city's read model with its discovery fields, which are absent when the city was not read from its document. */
export const discoveryPlansOf = (catalog: HomeCatalog): DiscoveryCityPlans => catalog.plans;

/**
 * Whether the header shows What's on: hidden only when the read model says
 * the city has no plan in the next 30 days. Unknown (no 30-day field) shows
 * it, as before the field existed.
 */
export function showWhatsOnFor(plans: HomeCityPlans): boolean {
  return (plans as DiscoveryCityPlans).hasUpcomingMonth !== false;
}

const inFormat = (format: DiscoveryFormatKey) => (item: {discoveryFormats?: readonly DiscoveryFormatKey[]}) =>
  item.discoveryFormats?.includes(format) ?? false;

/** The local weekday of an instant in a time zone, 0 for Sunday. */
function weekday(instant: string, timezone: string): number {
  const name = new Intl.DateTimeFormat("en-US", {weekday: "short", timeZone: timezone}).format(new Date(instant));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export type CityFormatFilter = "all" | "free" | "weekend";
export const cityFormatFilters: readonly CityFormatFilter[] = ["all", "free", "weekend"];

/** A plan is free when its price reads Free, as the backend counts imported plans. */
const isFree = (plan: HomePlan) => plan.priceLabel.trim().toLocaleLowerCase("en-IN") === "free";

export function filterFormatPlans(plans: readonly HomePlan[], filter: CityFormatFilter, timezone: string): HomePlan[] {
  if (filter === "free") return plans.filter(isFree);
  if (filter === "weekend") return plans.filter((plan) => [0, 6].includes(weekday(plan.startTime, timezone)));
  return [...plans];
}

/** Another format page in the same city that is worth a link: one the backend indexes. */
export interface CityFormatLink {
  format: DiscoveryFormatKey;
  href: string;
  label: string;
}

/** A format's counts for the "popular in the city" card, busiest first. */
export interface CityFormatCount {
  format: DiscoveryFormatKey;
  label: string;
  count: number;
}

/**
 * What a city-by-format page shows, from the selected city's read model:
 * the backend's counts and indexing decision for the format, the plans and
 * organisers tagged with it, and the city's other indexed format pages.
 * `page` is null when the city's read model has no format pages (read from
 * the public catalog instead of its document): the page then says plans are
 * unavailable rather than invent counts.
 */
export function cityFormatModel(catalog: HomeCatalog, format: DiscoveryFormatKey) {
  const plans = discoveryPlansOf(catalog);
  const page: DiscoveryFormatPage | null = plans.formatPages?.[format] ?? null;
  const formatPlans = upcomingPlans(plans.plans, catalog.readAt).filter(inFormat(format) as (plan: DiscoveryPlan) => boolean);
  const organizers = (plans.organizers as DiscoveryOrganizer[]).filter(inFormat(format));
  const others = discoveryFormatKeys.filter((key) => key !== format);
  const links: CityFormatLink[] = others
    .filter((key) => plans.formatPages?.[key]?.indexing === "index, follow")
    .map((key) => ({format: key, href: cityFormatPath(catalog.selected.slug, key), label: discoveryFormatCopy[key].name}));
  const popular: CityFormatCount[] = others
    .map((key) => ({format: key, label: discoveryFormatCopy[key].name, count: plans.formatPages?.[key]?.upcomingEventCount ?? 0}))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  return {
    page,
    indexed: page?.indexing === "index, follow",
    countsComplete: plans.monthCountsComplete,
    plans: formatPlans,
    organizers,
    links,
    popular,
    showWhatsOn: showWhatsOnFor(plans),
  };
}

/**
 * Whether a city-by-format path renders: "unavailable" when the city could
 * not be read or has no format pages yet, "notFound" when the format has no
 * organiser and no plan in the city (an empty page is not a page), else "page".
 */
export function cityFormatPageStatus(catalog: HomeCatalog, format: DiscoveryFormatKey): "page" | "notFound" | "unavailable" {
  if (catalog.phase === "unavailable") return "unavailable";
  const page = discoveryPlansOf(catalog).formatPages?.[format];
  if (!page) return "unavailable";
  return page.organizerCount + page.upcomingEventCount > 0 ? "page" : "notFound";
}

/** The formats a newcomer can walk into alone: the host makes the groups (pace groups, quiz teams, supper tables). */
export const newcomerFormats: readonly DiscoveryFormatKey[] = ["runClubs", "quizNights", "supperClubs"];

/**
 * The new-to-the-city page's plans: this week's in the newcomer formats, or,
 * when this week has none, the read model's next two weeks (the owner's
 * 14-day rule for a quiet week).
 */
export function newcomerPlans(catalog: HomeCatalog): {plans: HomePlan[]; quiet: boolean} {
  const newcomer = (plan: DiscoveryPlan) => newcomerFormats.some((format) => plan.discoveryFormats?.includes(format));
  const week = weekPlans(catalog.plans.plans, catalog.readAt).filter(newcomer);
  if (week.length) return {plans: week, quiet: false};
  return {plans: upcomingPlans(catalog.plans.plans, catalog.readAt).filter(newcomer), quiet: true};
}
