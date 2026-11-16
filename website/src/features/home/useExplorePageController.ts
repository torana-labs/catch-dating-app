import {explorePageCopy as copy} from "@content/explorePage";
import {interpolateContent as fill} from "@content/interpolate";
import {useMemo} from "react";
import {cityAlertSourcePage, type CityAlertInterest, type CityAlertPlace} from "../discovery/cityAlertsModel";
import {showWhatsOnFor} from "../discovery/discoveryModel";
import {organizerCard, planCard, weekPlans} from "./homeModel";
import type {HomeCatalog, HomeFormat} from "./homeTypes";
import {cityPagePath} from "./sections/cityChrome";
import {
  exploreFiltersFromSearch,
  exploreSearchFor,
  filterOrganizers,
  filterPlans,
  type ExploreFilters,
  type ExploreView,
} from "./exploreModel";

const count = (n: number, one: string, many: string) => n === 1 ? one : fill(many, {count: n});

/**
 * What the page leads with (the PlaybookExplore board's states):
 * - `full`: plans this week, listed with the rest of the next two weeks;
 * - `quiet`: nothing this week, so the next two weeks (the owner's 14-day rule), never "0 plans";
 * - `empty`: nothing in the next two weeks, so the hosts to follow and the WhatsApp capture;
 * - `soon`: a city not open yet, with who is joining;
 * - `filtered`: a search or filter the visitor set, with its count;
 * - `unavailable`: nothing could be read.
 */
export type ExploreState = "full" | "quiet" | "empty" | "soon" | "filtered" | "unavailable";

/** The WhatsApp capture's interest for Explore's format filter. */
const interestByFormat: Readonly<Record<HomeFormat, CityAlertInterest | null>> = {
  run: "runs", dinner: "dinners", games: "quizzes", courts: "courts", nightsOut: "nights_out", other: null,
};

/** How many organisers the hosts band under the plans shows before "See all organisers". */
const hostsBandSize = 4;

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
  const thisWeek = useMemo(() => weekPlans(plans.plans, readAt), [plans.plans, readAt]);
  const update = (change: Partial<ExploreFilters>) =>
    navigate(`${location.pathname}${exploreSearchFor({...filters, ...change}, location.search)}`, {replace: true});
  const filtered = filters.query !== "" || filters.format !== "all" || filters.when !== "any";
  const live = plans.status === "live";
  const unavailable = catalog.phase === "unavailable";
  const state: ExploreState = unavailable ? "unavailable" : !live ? "soon" : filtered ? "filtered" :
    thisWeek.length ? "full" : matchedPlans.length ? "quiet" : "empty";
  const viewHref = (view: ExploreView) => `${location.pathname}${exploreSearchFor({...filters, view}, location.search)}`;
  const place: CityAlertPlace = {citySlug: city.slug, cityLabel: city.label, sourcePage: cityAlertSourcePage(location.pathname), entry: "ex-wa"};
  const interest = filters.format === "all" ? null : interestByFormat[filters.format];
  const organizerCards = matchedOrganizers.map((organizer) => organizerCard(organizer, city));
  return {
    city,
    cities: catalog.cities,
    liveCity: catalog.liveCity,
    live,
    unavailable,
    state,
    showWhatsOn: showWhatsOnFor(plans),
    filters,
    filtered,
    // Beyond today, plans carry their date, so the next two weeks read in order.
    plans: matchedPlans.map((plan) => planCard(plan, city.timezone, filters.when !== "today")),
    organizers: organizerCards,
    /** The hosts band under the plans: the first few organisers, and a way to see them all. */
    hosts: organizerCards.slice(0, hostsBandSize),
    moreHosts: organizerCards.length > hostsBandSize,
    /** Plans and Organisers as tabs, each a link to its own view with its count. */
    tabs: (["plans", "organisers"] as const).map((view) => ({
      value: view,
      label: copy.view[view],
      count: view === "plans" ? matchedPlans.length : matchedOrganizers.length,
      href: viewHref(view),
    })),
    organisersHref: viewHref("organisers"),
    summary: filters.view === "plans" ? count(matchedPlans.length, copy.planCountOne, copy.planCount) :
      count(matchedOrganizers.length, copy.organiserCountOne, copy.organiserCount),
    exploreHref: cityPagePath(city.slug),
    cityHref: cityPagePath,
    notify: {place, interests: interest ? [interest] : []},
    update,
    clear: () => update({query: "", format: "all", when: "any"}),
    /** Another city keeps the filters on its own page. */
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(`${cityPagePath(slug)}${exploreSearchFor(filters)}`);
    },
  };
}

export type ExplorePageController = ReturnType<typeof useExplorePageController>;
