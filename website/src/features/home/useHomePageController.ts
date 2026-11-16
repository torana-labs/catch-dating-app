import {useMemo, useState} from "react";
import {homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {formatTiles, organizerCard, planCard, upcomingPlans, weekPlans, comingFormats} from "./homeModel";
import type {CitySource} from "./cityChoice";
import type {HomeCatalog, HomeFormat} from "./homeTypes";
import {cityPagePath} from "./sections/cityChrome";

export type HomeFilter = HomeFormat | "all";
const gridSize = 8;

/** Owns the format filter and binds the city's read model to the page's sections. */
export function useHomePageController(catalog: HomeCatalog, navigate: (href: string) => void = (href) => window.location.assign(href),
  citySource?: CitySource) {
  const {plans, readAt, selected: city} = catalog;
  const [filter, setFilter] = useState<HomeFilter>("all");
  const live = plans.status === "live";
  const week = useMemo(() => weekPlans(plans.plans, readAt), [plans.plans, readAt]);
  const ahead = useMemo(() => upcomingPlans(plans.plans, readAt), [plans.plans, readAt]);
  // A quiet week never reads as an empty city: the section widens to the
  // read model's whole window (the next two weeks), with dates on the cards.
  const upcoming = week.length === 0 && ahead.length > 0;
  const base = upcoming ? ahead : week;
  const tiles = useMemo(() => formatTiles(plans, city, readAt), [plans, city, readAt]);
  const filtered = filter === "all" ? base : base.filter((plan) => plan.format === filter);
  const shown = (filter === "all" ? filtered.slice(0, gridSize) : filtered).map((plan) => planCard(plan, city.timezone, upcoming));
  const filterName = filter === "all" ? "" : homeFormats.find((item) => item.format === filter)?.name ?? "";
  const note = catalog.phase === "unavailable" ? copy.week.unavailable :
    filter === "all" ? upcoming ? fill(copy.week.upcomingNote, {shown: shown.length, total: base.length, city: city.label}) :
      week.length ? fill(copy.week.note, {shown: shown.length, total: week.length}) : fill(copy.week.emptyWindow, {city: city.label}) :
    shown.length ? fill(upcoming ? copy.week.upcomingFilteredNote : copy.week.filteredNote, {shown: shown.length, total: filtered.length, format: filterName}) :
      fill(upcoming ? copy.week.upcomingEmptyFormat : copy.week.emptyFormat, {format: filterName.toLocaleLowerCase("en-IN")});
  return {
    city,
    /** How the page reached its city, when known: the launch notice records it. */
    citySource,
    cities: catalog.cities,
    liveCity: catalog.liveCity,
    live,
    filter,
    tiles,
    plans: shown,
    weekCount: week.length,
    /** True when this week is empty and the section shows the next two weeks instead. */
    upcoming,
    upcomingCount: upcoming ? ahead.length : 0,
    note,
    stickers: week.filter((plan, index, all) => all.findIndex((other) => other.format === plan.format) === index)
      .slice(0, 3).map((plan) => planCard(plan, city.timezone)),
    organizers: plans.organizers.slice(0, live ? 6 : 4).map((organizer) => organizerCard(organizer, city)),
    coming: comingFormats(plans),
    /** A format tile filters the week's plans; pressing the chosen one clears it. */
    chooseTile: (format: HomeFormat) => setFilter((current) => current === format ? "all" : format),
    setFilter,
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(`/?city=${encodeURIComponent(slug)}`);
    },
    cityHref: (slug: string) => `/?city=${encodeURIComponent(slug)}`,
    exploreHref: cityPagePath(city.slug),
  };
}

export type HomePageController = ReturnType<typeof useHomePageController>;
