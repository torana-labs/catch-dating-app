import {cityFormatPageCopy} from "@content/discovery/cityFormatPage";
import {discoveryFormatCopy} from "@content/discovery/discoveryFormats";
import {newToCityPageCopy} from "@content/discovery/newToCityPage";
import {interpolateContent as fill} from "@content/interpolate";
import type {HomeCatalog} from "../home/homeTypes";
import {cityFormatModel, cityFormatPageStatus, cityFormatPath, newToCityPath, type DiscoveryRoute} from "./discoveryModel";
import {discoveryFormatKeys, type DiscoveryCityPlans, type DiscoveryFormatKey} from "./discoveryTypes";

/**
 * What the routers do with a discovery path once its city is read: render
 * the page, answer 404, or render the page's unavailable state with a 503 so
 * no cache keeps it.
 */
export type DiscoveryPageStatus = "page" | "notFound" | "unavailable";

/** A discovery page's metadata, in the shape the routers' page metadata takes. */
export interface DiscoveryPageMeta {
  title: string;
  description: string;
  twitterDescription: string;
  canonicalPath: string;
  robots: "index, follow" | "noindex, follow";
}

/** The city-by-format page's title, description and robots line: the backend's indexing decision, noindex when it has none. */
export function cityFormatPageMeta(catalog: HomeCatalog, format: DiscoveryFormatKey): DiscoveryPageMeta {
  const words = discoveryFormatCopy[format];
  const city = catalog.selected.label;
  const description = fill(cityFormatPageCopy.meta.description,
    {format: words.name, city, plans: words.planMany, organisers: words.organiserMany});
  return {
    title: fill(cityFormatPageCopy.meta.title, {format: words.name, city}),
    description,
    twitterDescription: description,
    canonicalPath: cityFormatPath(catalog.selected.slug, format),
    robots: cityFormatModel(catalog, format).page?.indexing ?? "noindex, follow",
  };
}

/**
 * The new-to-the-city page's title, description and robots line. The owner
 * approved the page for search (18 Nov 2026): it is indexed in every listed
 * city, quiet weeks included, as it renders in every one.
 */
export function newToCityPageMeta(catalog: HomeCatalog): DiscoveryPageMeta {
  const city = catalog.selected.label;
  const description = fill(newToCityPageCopy.meta.description, {city});
  return {
    title: fill(newToCityPageCopy.meta.title, {city}),
    description,
    twitterDescription: description,
    canonicalPath: newToCityPath(catalog.selected.slug),
    robots: "index, follow",
  };
}

/**
 * Whether a matched discovery path renders, from the catalog read for its
 * city. A catalog that selected another city than the path names (a city
 * the reader does not list) is not this page. A city-by-format page follows
 * cityFormatPageStatus; a new-to-the-city page renders for every listed
 * city, quiet weeks included, and is unavailable only when the city could
 * not be read.
 */
export function discoveryPageStatus(route: DiscoveryRoute, catalog: HomeCatalog): DiscoveryPageStatus {
  if (catalog.selected.slug !== route.citySlug) return "notFound";
  if (route.kind === "cityFormat") return cityFormatPageStatus(catalog, route.format);
  return catalog.phase === "unavailable" ? "unavailable" : "page";
}

/** A matched discovery path's metadata. */
export function discoveryPageMeta(route: DiscoveryRoute, catalog: HomeCatalog): DiscoveryPageMeta {
  return route.kind === "cityFormat" ? cityFormatPageMeta(catalog, route.format) : newToCityPageMeta(catalog);
}

/**
 * The city-by-format pages the backend indexes in one city, from its
 * cityPlans read model, in the taxonomy's order. A city read without format
 * pages lists none. The sitemap adds each city's new-to-the-city page.
 */
export function indexedCityFormatPaths(citySlug: string, plans: Pick<DiscoveryCityPlans, "formatPages">): string[] {
  const pages = plans.formatPages;
  return discoveryFormatKeys.filter((format) => pages?.[format]?.indexing === "index, follow")
    .map((format) => cityFormatPath(citySlug, format));
}
