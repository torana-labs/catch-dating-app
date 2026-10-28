import {cache} from "react";
import {activeMarket} from "../content/markets";
import type {MarketCity} from "../content/markets/types";
import {cityPlansFromListings} from "../features/home/cityPlansFromListings";
import {homeCatalogFromPlans} from "../features/home/homeCatalog";
import type {HomeCatalog, HomeCityPlans} from "../features/home/homeTypes";
import type {HostListing} from "../features/organizers/types";
import {assemblePublicCatalog, publicFirestore} from "./publicCatalog";
import {cityPlansAt, findCityPlans} from "./repositories/publicPageRepository";
import type {PublicReader} from "./repositories/publicReader";

/**
 * The homepage reads one cityPlans document per market city (functions/src/
 * cityPlans): the chosen city's plans and every city's status for the picker.
 * A city whose document is missing or invalid is built from the public
 * catalog, read at most once, until the environment's Functions have built it.
 */
export async function assembleHomeCatalog(
  db: PublicReader, requestedCity: string | undefined, readAt: number,
  cities: readonly MarketCity[] = activeMarket.cities,
): Promise<HomeCatalog> {
  const documents = await Promise.all(cities.map((city) =>
    findCityPlans(db, city.marketSlug).catch(() => null)));
  let listings: Promise<HostListing[]> | null = null;
  const fallbackListings = () => (listings ??= assemblePublicCatalog(db, readAt)
    .then((catalog) => catalog.listings).catch(() => []));
  const plans: HomeCityPlans[] = await Promise.all(cities.map(async (city, index) => {
    const document = documents[index];
    if (document) {
      const {builtAt: _builtAt, ...current} = cityPlansAt(document, readAt);
      return current satisfies HomeCityPlans;
    }
    return cityPlansFromListings(await fallbackListings(), city, cities, readAt);
  }));
  return homeCatalogFromPlans(cities, plans, requestedCity, readAt);
}

/** React cache deduplicates within one render only. */
export const readHomeCatalog = cache((requestedCity: string | undefined) =>
  assembleHomeCatalog(publicFirestore(), requestedCity, Date.now()));
