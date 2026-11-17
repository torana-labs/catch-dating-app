import {useMemo, useState} from "react";
import {homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {websiteCities} from "@content/markets";
import {comingFormats, homeCityState, organizerCard, planCard, proofReview, upcomingPlans, weekPlans, type HomeReview} from "./homeModel";
import type {CitySource} from "./cityChoice";
import type {HomeCatalog, HomeFormat} from "./homeTypes";
import {cityPagePath} from "./sections/cityChrome";

export type HomeFilter = HomeFormat | "all";
/** Plans shown at once before "See everything": the board's rail of three. */
const gridSize = 3;

/**
 * Owns the format filter and binds the city's read model to the page's
 * sections in the board's three states: busy, thin (an open city with fewer
 * than five plans in the next two weeks) and launching.
 */
export function useHomePageController(catalog: HomeCatalog, navigate: (href: string) => void = (href) => window.location.assign(href),
  citySource?: CitySource, reviews: readonly HomeReview[] = []) {
  const {plans, readAt, selected: city} = catalog;
  const [chosenFilter, setFilter] = useState<HomeFilter>("all");
  const unavailable = catalog.phase === "unavailable";
  // A city whose plans could not be read stays open and says so; it never reads as new or thin.
  const state = unavailable && plans.status === "live" ? "busy" : homeCityState(plans, readAt);
  const live = state !== "launching";
  const thin = state === "thin";
  const week = useMemo(() => weekPlans(plans.plans, readAt), [plans.plans, readAt]);
  const ahead = useMemo(() => upcomingPlans(plans.plans, readAt), [plans.plans, readAt]);
  // A quiet week never reads as an empty city: the band widens to the next
  // two weeks, with dates on the cards. A thin city always shows them all.
  const upcoming = thin || (week.length === 0 && ahead.length > 0);
  const base = upcoming ? ahead : week;
  // Only a busy city has enough plans to filter by format.
  const filter: HomeFilter = thin ? "all" : chosenFilter;
  const filtered = filter === "all" ? base : base.filter((plan) => plan.format === filter);
  const shown = (thin || filter !== "all" ? filtered : filtered.slice(0, gridSize)).map((plan) => planCard(plan, city.timezone, upcoming));
  const filterName = filter === "all" ? "" : homeFormats.find((item) => item.format === filter)?.name ?? "";
  const note = unavailable ? copy.week.unavailable :
    thin ? ahead.length ? fill(copy.week.thinNote, {shown: shown.length, total: ahead.length}) : fill(copy.week.emptyWindow, {city: city.label}) :
    filter === "all" ? upcoming ? fill(copy.week.upcomingNote, {shown: shown.length, total: base.length, city: city.label}) :
      week.length ? fill(copy.week.note, {shown: shown.length, total: week.length}) : fill(copy.week.emptyWindow, {city: city.label}) :
    shown.length ? fill(upcoming ? copy.week.upcomingFilteredNote : copy.week.filteredNote, {shown: shown.length, total: filtered.length, format: filterName}) :
      fill(upcoming ? copy.week.upcomingEmptyFormat : copy.week.emptyFormat, {format: filterName.toLocaleLowerCase("en-IN")});
  const heroEyebrow = state === "launching" ? fill(copy.launchHero.eyebrow, {city: city.label}) :
    unavailable ? fill(copy.hero.cityEyebrow, {city: city.label}) : thin ? fill(copy.hero.thinEyebrow, {city: city.label}) :
    week.length > 1 ? fill(copy.hero.busyEyebrow, {city: city.label, count: week.length}) :
    week.length === 1 ? fill(copy.hero.busyEyebrowOne, {city: city.label}) : fill(copy.hero.quietEyebrow, {city: city.label});
  const next = ahead[0];
  const cityHref = (slug: string) => `/?city=${encodeURIComponent(slug)}`;
  return {
    city,
    /** How the page reached its city, when known: the launch notice records it. */
    citySource,
    cities: catalog.cities,
    liveCity: catalog.liveCity,
    /** The city's catalog id, which names its founding-host counter. */
    marketId: websiteCities.find((item) => item.slug === city.slug)?.id,
    /** busy, thin or launching: which hero leads and where the host band sits. */
    state,
    live,
    unavailable,
    heroEyebrow,
    /** The soonest plan, for the card floating over the hero's phone; dated when it is not this week. */
    heroPlan: next ? planCard(next, city.timezone, !week.includes(next)) : null,
    filter,
    plans: shown,
    weekCount: week.length,
    /** True when the band shows the next two weeks: a quiet week, or a thin city. */
    upcoming,
    note,
    organizers: plans.organizers.slice(0, live ? 8 : 4).map((organizer) => organizerCard(organizer, city)),
    coming: comingFormats(plans),
    /** The one review the proof band quotes, only when a guest who booked has left one. */
    review: proofReview(reviews),
    setFilter,
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(cityHref(slug));
    },
    cityHref,
    /** The other open cities, so a visitor can switch from the plans band. */
    otherCities: catalog.cities.filter((other) => other.status === "live" && other.slug !== city.slug)
      .map((other) => ({label: fill(copy.week.cityLink, {city: other.label}), href: cityHref(other.slug)})),
    exploreHref: cityPagePath(city.slug),
  };
}

export type HomePageController = ReturnType<typeof useHomePageController>;
