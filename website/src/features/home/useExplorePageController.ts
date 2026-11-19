import {explorePageCopy as copy} from "@content/explorePage";
import {interpolateContent as fill} from "@content/interpolate";
import {useMemo} from "react";
import {cityAlertsCopy} from "@content/discovery/cityAlerts";
import {exploreAlertInterests} from "../discovery/cityAlertsModel";
import {discoveryOrganizerCard, discoveryPlanCard} from "../discovery/discoveryCards";
import {cityDiscoveryLinks, showWhatsOnFor} from "../discovery/discoveryModel";
import {weekPlans} from "./homeModel";
import type {HomeCatalog} from "./homeTypes";
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
 *
 * The list is the union's one source: the release smoke's contract test
 * walks every state, so a new one cannot lead with copy the smoke rejects.
 */
export const exploreStates = ["full", "quiet", "empty", "soon", "filtered", "unavailable"] as const;
export type ExploreState = (typeof exploreStates)[number];

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
  const organizerCards = matchedOrganizers.map((organizer) => discoveryOrganizerCard(organizer, city));
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
    plans: matchedPlans.map((plan) => discoveryPlanCard(plan, city.timezone, filters.when !== "today")),
    organizers: organizerCards,
    /** The hosts band under the plans: the first few organisers, and a way to see them all. */
    hosts: organizerCards.slice(0, hostsBandSize),
    moreHosts: organizerCards.length > hostsBandSize,
    /**
     * Plans and Organisers as tabs, each a link to its own view. The count of
     * the view shown is the summary line's; the tab bar's dimmed counts fall
     * short of AA contrast on its track, so the tabs carry none.
     */
    tabs: (["plans", "organisers"] as const).map((view) => ({
      value: view,
      label: copy.view[view],
      href: viewHref(view),
    })),
    organisersHref: viewHref("organisers"),
    summary: filters.view === "plans" ? count(matchedPlans.length, copy.planCountOne, copy.planCount) :
      count(matchedOrganizers.length, copy.organiserCountOne, copy.organiserCount),
    exploreHref: cityPagePath(city.slug),
    cityHref: cityPagePath,
    /** The city's new-to-the-city page and its format pages that exist, for the header and footer. */
    discovery: cityDiscoveryLinks(catalog),
    /** The WhatsApp form's city_alerts lead: this page, and the format filter's interest. */
    notify: {place: {citySlug: city.slug, cityLabel: city.label, sourcePage: location.pathname, entry: "ex-wa"},
      interests: exploreAlertInterests(filters.format)},
    /** What the phone action bar's WhatsApp button types: new plans in the city. */
    notifyMessage: fill(cityAlertsCopy.message, {city: city.label}),
    update,
    clear: () => update({query: "", format: "all", when: "any"}),
    /** Another city keeps the filters on its own page. */
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(`${cityPagePath(slug)}${exploreSearchFor(filters)}`);
    },
  };
}

export type ExplorePageController = ReturnType<typeof useExplorePageController>;
