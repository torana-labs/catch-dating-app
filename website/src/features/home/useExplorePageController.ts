import {explorePageCopy as copy} from "@content/explorePage";
import {interpolateContent as fill} from "@content/interpolate";
import {useMemo} from "react";
import {organizerCard, planCard} from "./homeModel";
import type {HomeCatalog} from "./homeTypes";
import {cityPagePath} from "./sections/cityChrome";
import {exploreFiltersFromSearch, exploreSearchFor, filterOrganizers, filterPlans, type ExploreFilters} from "./exploreModel";

const count = (n: number, one: string, many: string) => n === 1 ? one : fill(many, {count: n});

/**
 * Explore's state lives in its URL, so a filtered view is a link: city in the
 * path (a city page), and q, format, when and show in the query. Filters
 * replace the URL in place; a city change loads that city's page.
 */
export function useExplorePageController(catalog: HomeCatalog, location: {pathname: string; search: string},
  navigate: (href: string, options?: {replace?: boolean}) => void) {
  const {plans, readAt, selected: city} = catalog;
  const filters = exploreFiltersFromSearch(location.search);
  const matchedPlans = useMemo(() => filterPlans(plans.plans, filters, readAt, city.timezone),
    [plans.plans, filters.query, filters.format, filters.when, readAt, city.timezone]);
  const matchedOrganizers = useMemo(() => filterOrganizers(plans.organizers, filters),
    [plans.organizers, filters.query, filters.format]);
  const update = (change: Partial<ExploreFilters>) =>
    navigate(`${location.pathname}${exploreSearchFor({...filters, ...change}, location.search)}`, {replace: true});
  const filtered = filters.query !== "" || filters.format !== "all" || filters.when !== "any";
  return {
    city,
    cities: catalog.cities,
    liveCity: catalog.liveCity,
    live: plans.status === "live",
    unavailable: catalog.phase === "unavailable",
    filters,
    filtered,
    plans: matchedPlans.map((plan) => planCard(plan, city.timezone)),
    organizers: matchedOrganizers.map((organizer) => organizerCard(organizer, city)),
    summary: filters.view === "plans" ? count(matchedPlans.length, copy.planCountOne, copy.planCount) :
      count(matchedOrganizers.length, copy.organiserCountOne, copy.organiserCount),
    exploreHref: cityPagePath(city.slug),
    cityHref: cityPagePath,
    update,
    clear: () => update({query: "", format: "all", when: "any"}),
    /** Another city keeps the filters on its own page. */
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(`${cityPagePath(slug)}${exploreSearchFor(filters)}`);
    },
  };
}

export type ExplorePageController = ReturnType<typeof useExplorePageController>;
