import {activeFeaturedCity} from "@content/markets";
import type {MarketCity} from "@content/markets/types";
import {weekPlans} from "./homeModel";
import type {HomeCatalog, HomeCity, HomeCityPlans} from "./homeTypes";

/**
 * The homepage catalog from every market city's plans: the cities with their
 * status for the picker, the chosen city (the featured city by default) and
 * the busiest other live city for a launching-soon page.
 */
export function homeCatalogFromPlans(
  cities: readonly MarketCity[], plans: readonly HomeCityPlans[], requestedCity: string | null | undefined, readAt: number,
): HomeCatalog {
  const summaries: HomeCity[] = cities.map((city, index) => ({
    slug: city.slug,
    marketSlug: city.marketSlug,
    label: plans[index].cityLabel,
    status: plans[index].status,
    weekPlanCount: weekPlans(plans[index].plans, readAt).length,
    timezone: city.timezone,
  }));
  const chosen = summaries.findIndex((city) => city.slug === requestedCity);
  const featured = summaries.findIndex((city) => city.slug === activeFeaturedCity.slug);
  const selectedIndex = chosen >= 0 ? chosen : Math.max(0, featured);
  const liveCity = summaries.filter((city, index) => index !== selectedIndex && city.status === "live")
    .sort((a, b) => b.weekPlanCount - a.weekPlanCount)[0] ?? null;
  return {readAt, cities: summaries, selected: summaries[selectedIndex], plans: plans[selectedIndex], liveCity};
}

/** The city a homepage URL asks for, from its search string. */
export function requestedHomeCity(search: string) {
  return new URLSearchParams(search).get("city");
}
