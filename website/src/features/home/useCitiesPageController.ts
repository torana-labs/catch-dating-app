import {citiesPageCopy as copy} from "@content/citiesPage";
import {interpolateContent as fill} from "@content/interpolate";
import {countryName, websiteCities} from "@content/markets";
import {cityFooterNote, cityGroups} from "./homeModel";
import type {HomeCatalog, HomeCity} from "./homeTypes";
import {cityPagePath} from "./sections/cityChrome";

export interface CitiesPageRow {
  slug: string;
  label: string;
  live: boolean;
  /** "2 plans this week", "New", "Launching soon" or "Opens 15 January". */
  note?: string;
  href: string;
  action: string;
}

function launchNote(city: HomeCity) {
  const launchDate = websiteCities.find((item) => item.slug === city.slug)?.launchDate;
  if (!launchDate) return copy.soon;
  const date = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "long", timeZone: "UTC"}).format(new Date(`${launchDate}T00:00:00Z`));
  return fill(copy.opens, {date});
}

/**
 * /cities/: every listed city by country. An open city links its page with
 * its honest count; a city not open links the homepage's launch notice, where
 * people ask to hear when it opens. A country with no city open says so once.
 */
export function useCitiesPageController(catalog: HomeCatalog, navigate: (href: string) => void) {
  const groups = cityGroups(catalog.cities, countryName).map((group) => ({
    ...group,
    note: group.anyLive ? undefined : fill(copy.countrySoon, {country: group.name}),
    rows: group.cities.map((city): CitiesPageRow => {
      const live = city.status === "live";
      return {
        slug: city.slug,
        label: city.label,
        live,
        note: live ? cityFooterNote(city) : group.anyLive ? launchNote(city) : undefined,
        href: live ? cityPagePath(city.slug) : `/?${new URLSearchParams({city: city.slug})}#whats-on`,
        action: live ? copy.seeWhatsOn : copy.getNotified,
      };
    }),
  }));
  return {
    city: catalog.selected,
    cities: catalog.cities,
    groups,
    unavailable: catalog.phase === "unavailable",
    exploreHref: cityPagePath(catalog.selected.slug),
    chooseCity: (slug: string) => navigate(cityPagePath(slug)),
  };
}

export type CitiesPageController = ReturnType<typeof useCitiesPageController>;
