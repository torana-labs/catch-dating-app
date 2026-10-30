import {cache} from "react";
import {activeMarket} from "../content/markets";
import type {MarketCity} from "../content/markets/types";
import {cityPlansFromListings} from "../features/home/cityPlansFromListings";
import {homeCatalogFromPlans} from "../features/home/homeCatalog";
import type {HomeCatalog, HomeCityPlans} from "../features/home/homeTypes";
import type {HostListing} from "../features/organizers/types";
import {assemblePublicCatalog, publicReader} from "./publicCatalog";
import {cityPlansAt, findCityPlans} from "./repositories/publicPageRepository";
import {withinReadDeadline, type PublicReader} from "./repositories/publicReader";

/** Each city's plans, or null for a city nothing could be read for. */
async function readCityPlans(
  db: PublicReader, cities: readonly MarketCity[], readAt: number,
): Promise<(HomeCityPlans | null)[]> {
  const documents = await Promise.all(cities.map((city) =>
    findCityPlans(db, city.marketSlug).catch(() => null)));
  let listings: Promise<HostListing[] | null> | null = null;
  const fallbackListings = () => (listings ??= assemblePublicCatalog(db, readAt)
    .then((catalog) => catalog.listings).catch(() => null));
  return Promise.all(cities.map(async (city, index) => {
    const document = documents[index];
    if (document) {
      const {builtAt: _builtAt, ...current} = cityPlansAt(document, readAt);
      return current satisfies HomeCityPlans;
    }
    const fallback = await fallbackListings();
    return fallback ? cityPlansFromListings(fallback, city, cities, readAt) : null;
  }));
}

/**
 * The homepage reads one cityPlans document per market city (functions/src/
 * cityPlans): the chosen city's plans and every city's status for the picker.
 * A city whose document is missing or invalid is built from the public
 * catalog, read at most once, until the environment's Functions have built it.
 * The whole read shares the public read deadline; a reader that could not be
 * built (null) or a read that runs out of time reads as nothing.
 */
export async function assembleHomeCatalog(
  db: PublicReader | null, requestedCity: string | undefined, readAt: number,
  cities: readonly MarketCity[] = activeMarket.cities,
): Promise<HomeCatalog> {
  const nothing = cities.map(() => null);
  const read = db ? await withinReadDeadline(readCityPlans(db, cities, readAt)).catch(() => nothing) : nothing;
  const plans: HomeCityPlans[] = cities.map((city, index) => {
    const current = read[index];
    if (current) return current;
    // Nothing could be read: a launched city stays live rather than claim it is launching soon.
    const built = cityPlansFromListings([], city, cities, readAt);
    return city.status === "live" ? {...built, status: "live"} : built;
  });
  const catalog = homeCatalogFromPlans(cities, plans, requestedCity, readAt);
  const selected = cities.findIndex((city) => city.slug === catalog.selected.slug);
  return read[selected] ? catalog : {...catalog, phase: "unavailable"};
}

/**
 * React cache deduplicates within one render only. A missing configuration or
 * absent credentials read as nothing, so the page renders its unavailable
 * state at once instead of failing the render.
 */
export const readHomeCatalog = cache(async (requestedCity: string | undefined) =>
  assembleHomeCatalog(await publicReader().catch(() => null), requestedCity, Date.now()));
