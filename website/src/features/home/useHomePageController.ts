import {useMemo, useState} from "react";
import {homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {formatTiles, organizerCard, planCard, weekPlans, comingFormats} from "./homeModel";
import type {HomeCatalog, HomeFormat} from "./homeTypes";

export type HomeFilter = HomeFormat | "all";
const gridSize = 8;

/** Owns the format filter and binds the city's read model to the page's sections. */
export function useHomePageController(catalog: HomeCatalog, navigate: (href: string) => void = (href) => window.location.assign(href)) {
  const {plans, readAt, selected: city} = catalog;
  const [filter, setFilter] = useState<HomeFilter>("all");
  const live = plans.status === "live";
  const week = useMemo(() => weekPlans(plans.plans, readAt), [plans.plans, readAt]);
  const tiles = useMemo(() => formatTiles(plans, city, readAt), [plans, city, readAt]);
  const filtered = filter === "all" ? week : week.filter((plan) => plan.format === filter);
  const shown = (filter === "all" ? filtered.slice(0, gridSize) : filtered).map((plan) => planCard(plan, city.timezone));
  const filterName = filter === "all" ? "" : homeFormats.find((item) => item.format === filter)?.name ?? "";
  const note = filter === "all" ? fill(copy.week.note, {shown: shown.length, total: week.length}) :
    shown.length ? fill(copy.week.filteredNote, {shown: shown.length, total: filtered.length, format: filterName}) :
      fill(copy.week.emptyFormat, {format: filterName.toLocaleLowerCase("en-IN")});
  return {
    city,
    cities: catalog.cities,
    liveCity: catalog.liveCity,
    live,
    filter,
    tiles,
    plans: shown,
    weekCount: week.length,
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
    exploreHref: `/explore/?city=${encodeURIComponent(city.slug)}`,
  };
}

export type HomePageController = ReturnType<typeof useHomePageController>;
