import {websiteCities} from "../content/markets";
import type {MarketCity} from "../content/markets/types";
import {newToCityPath} from "../features/discovery/discoveryModel";
import {indexedCityFormatPaths} from "../features/discovery/discoveryRoute";
import {findCityPlans} from "./repositories/publicPageRepository";
import {withinReadDeadline, type PublicReader} from "./repositories/publicReader";

/**
 * The discovery pages sitemap.xml lists: every website city's new-to-the-city
 * page, which renders for every listed city, then the city-by-format pages
 * its cityPlans document indexes (formatPages[format].indexing), read once
 * per city within the public read deadline. A city without a document lists
 * no format pages. A failed read throws, so the sitemap answers 503 rather
 * than drop indexed pages.
 */
export async function readIndexedDiscoveryPaths(
  db: PublicReader, cities: readonly MarketCity[] = websiteCities,
): Promise<string[]> {
  const documents = await withinReadDeadline(Promise.all(cities.map((city) => findCityPlans(db, city.marketSlug))));
  return cities.flatMap((city, index) => {
    const document = documents[index];
    return [newToCityPath(city.slug), ...(document ? indexedCityFormatPaths(city.slug, document) : [])];
  });
}
