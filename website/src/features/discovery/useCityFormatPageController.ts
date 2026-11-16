import {cityFormatPageCopy as copy} from "@content/discovery/cityFormatPage";
import {discoveryFormatCopy} from "@content/discovery/discoveryFormats";
import {interpolateContent as fill} from "@content/interpolate";
import {whatsappChatHref} from "@content/site";
import {useMemo, useState} from "react";
import type {HomeCatalog} from "../home/homeTypes";
import {organizerCard, planCard, shortWhen} from "../home/homeModel";
import {cityPagePath} from "../home/sections/cityChrome";
import {cityAlertInterests, cityAlertSourcePage, type CityAlertPlace} from "./cityAlertsModel";
import {
  cityFormatModel,
  cityFormatPageStatus,
  cityFormatPath,
  filterFormatPlans,
  newToCityPath,
  type CityFormatFilter,
} from "./discoveryModel";
import type {DiscoveryFormatKey} from "./discoveryTypes";

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase("en-IN") + text.slice(1);

/** The page's title, description and robots line: the backend's indexing decision, noindex when it has none. */
export function cityFormatPageMeta(catalog: HomeCatalog, format: DiscoveryFormatKey) {
  const words = discoveryFormatCopy[format];
  const city = catalog.selected.label;
  const page = cityFormatModel(catalog, format).page;
  return {
    title: fill(copy.meta.title, {format: words.name, city}),
    description: fill(copy.meta.description, {format: words.name, city, plans: words.planMany, organisers: words.organiserMany}),
    canonicalPath: cityFormatPath(catalog.selected.slug, format),
    robots: page?.indexing ?? "noindex, follow",
  };
}

/**
 * The city-by-format page (/<city>/<format>/, the PlaybookCityFormat board)
 * from the selected city's cityPlans read model. Every count is the
 * backend's (formatPages: organisers, plans and free plans in the next 30
 * days); the plans and organisers are the read model's own, tagged with the
 * format. Indexed pages get the full layout; below the bar (the backend says
 * noindex) the page is the board's thin state.
 */
export function useCityFormatPageController(catalog: HomeCatalog, format: DiscoveryFormatKey,
  navigate: (href: string) => void, pathname = cityFormatPath(catalog.selected.slug, format)) {
  const [filter, setFilter] = useState<CityFormatFilter>("all");
  const model = useMemo(() => cityFormatModel(catalog, format), [catalog, format]);
  const status = cityFormatPageStatus(catalog, format);
  const city = catalog.selected;
  const words = discoveryFormatCopy[format];
  const tokens = {format: words.name, formatLower: lowerFirst(words.name), city: city.label};
  const count = (value: number) => model.countsComplete === false ? fill(copy.stats.atLeast, {count: value}) : String(value);
  const page = model.page;
  const shownPlans = filterFormatPlans(model.plans, filter, city.timezone);
  const place: CityAlertPlace = {citySlug: city.slug, cityLabel: city.label, sourcePage: cityAlertSourcePage(pathname), entry: "cf-wa"};
  const firstOrganizer = model.organizers[0];
  const freeAnswer = page && page.freeEventCount > 0 ?
    fill(copy.faq.freeSome, {free: count(page.freeEventCount), upcoming: count(page.upcomingEventCount), plans: words.planMany}) :
    fill(copy.faq.freeNone, {plans: words.planMany});
  return {
    status,
    indexed: model.indexed,
    city,
    cities: catalog.cities,
    exploreHref: cityPagePath(city.slug),
    showWhatsOn: model.showWhatsOn,
    /** Another city keeps the format. */
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(cityFormatPath(slug, format));
    },
    hero: {
      kicker: fill(copy.hero.kicker, {city: tokens.city, format: tokens.format}),
      title: fill(copy.hero.title, {format: tokens.format, city: tokens.city}),
      lead: words.lead,
      stats: page ? [
        {figure: count(page.organizerCount), title: page.organizerCount === 1 ? words.organiserOne : words.organiserMany},
        {figure: count(page.upcomingEventCount), title: fill(copy.stats.upcoming, {plans: page.upcomingEventCount === 1 ? words.planOne : words.planMany})},
        {figure: count(page.freeEventCount), title: copy.stats.free},
      ] : [],
    },
    plans: {
      kicker: copy.plans.kicker,
      title: fill(copy.plans.title, {plans: words.planMany}),
      filter,
      setFilter,
      filterLabel: (value: CityFormatFilter) => copy.plans.filters[value],
      filtersLabel: copy.plans.filtersLabel,
      cards: shownPlans.map((plan) => planCard(plan, city.timezone, true)),
      empty: filter === "all" ?
        {title: fill(copy.plans.empty, {plans: words.planMany}), message: fill(copy.plans.emptyBody, {city: city.label}), clear: false} :
        {title: fill(copy.plans.filteredEmpty, {plans: words.planMany}), message: copy.plans.filteredEmptyBody, clear: true},
      clearLabel: copy.plans.clear,
      seeAll: {label: fill(copy.plans.seeAll, {city: city.label}), href: cityPagePath(city.slug)},
    },
    organisers: {
      kicker: fill(copy.organisers.kicker, {organisers: words.organiserMany}),
      title: copy.organisers.title,
      lead: copy.organisers.lead,
      cards: model.organizers.map((organizer) => organizerCard(organizer, city)),
      join: {label: words.joinAction, href: "/host/"},
    },
    firstTime: "firstTime" in words ? {
      kicker: words.firstTime.kicker,
      title: fill(words.firstTime.title, {city: city.label}),
      ticks: words.firstTime.ticks,
    } : null,
    thin: {
      lead: fill(copy.thin.lead, {formatLower: tokens.formatLower, city: city.label}),
      ticks: [
        ...(model.organizers.length ? model.organizers.slice(0, 3).map((organizer) => organizer.nextPlan ?
          fill(copy.thin.organiserNext, {name: organizer.name, when: shortWhen(organizer.nextPlan.startTime, city.timezone)}) :
          fill(copy.thin.organiserNoPlan, {name: organizer.name})) : [fill(copy.thin.noneYet, {organisers: words.organiserMany})]),
        fill(copy.thin.later, {organisers: words.organiserMany}),
      ],
      actions: [
        ...(firstOrganizer?.path ? [{label: fill(copy.thin.seeOrganiser, {name: firstOrganizer.name}), href: firstOrganizer.path}] : []),
        {label: copy.thin.tellUs, href: whatsappChatHref(fill(copy.thin.tellUsMessage, {formatLower: tokens.formatLower, city: city.label})),
          newTab: true, variant: "secondary" as const},
      ],
      popular: model.popular.length ? {
        title: fill(copy.thin.popularTitle, {city: city.label}),
        rows: model.popular.map((item) => ({title: item.label, value: count(item.count)})),
      } : null,
    },
    more: {
      kicker: copy.more.kicker,
      title: copy.more.title,
      links: [...model.links.map((link) => ({label: link.label, href: link.href})),
        {label: copy.more.newToCity, href: newToCityPath(city.slug)}],
    },
    faq: {
      kicker: fill(copy.faq.kicker, {format: tokens.format, city: city.label}),
      title: fill(copy.faq.title, {format: tokens.format, city: city.label}),
      items: [
        {id: "free", question: fill(copy.faq.freeQuestion, {formatLower: tokens.formatLower, city: city.label}), answer: freeAnswer},
        ...("faq" in words ? words.faq.map((item, index) => ({id: `format-${index + 1}`, ...item})) : []),
        {id: "solo", question: copy.faq.soloQuestion, answer: copy.faq.soloAnswer},
        {id: "book-free", question: fill(copy.faq.bookFreeQuestion, {plan: words.planOne}), answer: copy.faq.bookFreeAnswer},
        {id: "start", question: copy.faq.startQuestion, answer: copy.faq.startAnswer},
      ],
    },
    notify: {
      place,
      interests: cityAlertInterests([format]),
      kicker: fill(copy.notify.kicker, {plans: words.planMany}),
      title: copy.notify.title,
    },
  };
}

export type CityFormatPageController = ReturnType<typeof useCityFormatPageController>;
