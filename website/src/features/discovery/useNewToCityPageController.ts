import {cityAlertsCopy} from "@content/discovery/cityAlerts";
import {discoveryPagesCopy} from "@content/discovery/discoveryPages";
import {newToCityPageCopy as copy} from "@content/discovery/newToCityPage";
import {interpolateContent as fill} from "@content/interpolate";
import {useMemo} from "react";
import type {HomeCatalog} from "../home/homeTypes";
import {datedWhen} from "../home/homeModel";
import {cityPagePath} from "../home/sections/cityChrome";
import {cityAlertsAnchor} from "./CityAlertsCapture";
import {cityAlertInterests} from "./cityAlertsModel";
import {discoveryPlanCard} from "./discoveryCards";
import {cityDiscoveryLinks, newcomerFormats, newcomerPlans, newToCityPath, showWhatsOnFor} from "./discoveryModel";

/** The plans band's anchor, which the hero's first action scrolls to. */
export const newcomerPlansAnchor = "solo";

/**
 * The new-to-the-city page (/new-to-<city>/, the PlaybookNewToCity board)
 * from the selected city's cityPlans read model: this week's plans in the
 * formats where the host makes the groups (or the next two weeks when this
 * week is quiet), the board's authored bands, and the WhatsApp capture for
 * those formats.
 */
export function useNewToCityPageController(catalog: HomeCatalog, navigate: (href: string) => void) {
  const city = catalog.selected;
  const found = useMemo(() => newcomerPlans(catalog), [catalog]);
  const first = found.plans[0];
  return {
    city,
    /** The city's new-to-the-city page and format pages that exist, for the header and footer. */
    discovery: cityDiscoveryLinks(catalog),
    cities: catalog.cities,
    unavailable: catalog.phase === "unavailable",
    exploreHref: cityPagePath(city.slug),
    showWhatsOn: showWhatsOnFor(catalog.plans),
    chooseCity: (slug: string) => {
      if (slug !== city.slug) navigate(newToCityPath(slug));
    },
    hero: {
      kicker: fill(copy.hero.kicker, {city: city.label}),
      title: copy.hero.title,
      lead: copy.hero.lead,
      actions: [
        {label: copy.hero.plansAction, href: `#${newcomerPlansAnchor}`},
        {label: copy.hero.notifyAction, href: `#${cityAlertsAnchor}`, variant: "secondary" as const},
      ],
      /** A real plan from the list, as the board's tilted card; no "came alone" line, which no read model holds. */
      card: first ? {
        label: fill(copy.hero.cardLabel, {city: city.label}),
        title: first.title,
        subtitle: fill(copy.hero.cardSubtitle, {host: first.organizer.name, place: first.location, when: datedWhen(first.startTime, city.timezone)}),
        photo: first.photoUrl,
        price: first.priceLabel,
      } : null,
    },
    plans: {
      kicker: copy.plans.kicker,
      title: found.quiet ? copy.plans.quietTitle : copy.plans.title,
      lead: copy.plans.lead,
      cards: found.plans.map((plan) => discoveryPlanCard(plan, city.timezone, found.quiet)),
      empty: {title: copy.plans.empty, message: copy.plans.emptyBody},
      seeAll: {label: fill(copy.plans.seeAll, {city: city.label}), href: cityPagePath(city.slug)},
    },
    alone: copy.alone,
    month: {...copy.month, kicker: fill(copy.month.kicker, {city: city.label})},
    trust: {...copy.trust, actionHref: "/help/"},
    faq: {
      kicker: copy.faq.kicker,
      title: fill(copy.faq.title, {city: city.label}),
      items: copy.faq.items.map((item, index) => ({id: `new-to-city-${index + 1}`, ...item})),
    },
    notify: {place: {citySlug: city.slug, cityLabel: city.label, sourcePage: newToCityPath(city.slug), entry: "nc-wa"},
      interests: cityAlertInterests(newcomerFormats), message: fill(cityAlertsCopy.newcomerMessage, {city: city.label}), kicker: copy.notify.kicker, title: copy.notify.title},
    dock: {label: discoveryPagesCopy.dock.newToCity, href: `#${newcomerPlansAnchor}`},
  };
}

export type NewToCityPageController = ReturnType<typeof useNewToCityPageController>;
