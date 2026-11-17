import {homeStoryReadAt, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import type {HomeCatalog} from "../home/homeTypes";
import {
  discoveryFormatKeys,
  discoveryFormatSlugs,
  type DiscoveryCityFields,
  type DiscoveryFormatKey,
  type DiscoveryFormatPage,
  type DiscoveryOrganizer,
  type DiscoveryPlan,
} from "./discoveryTypes";

/**
 * Story and test catalogs with the cityPlans document's 30-day and
 * city-by-format fields, built on the homepage's Mumbai and Pune fixtures.
 * The counts are fixture values for the layout, as the document would
 * carry them; no page writes a figure of its own.
 */

/** The fixture plans' discovery formats, as functions/src/cityPlans/discoveryFormats.ts tags them. */
const planFormats: Readonly<Record<string, readonly DiscoveryFormatKey[]>> = {
  "thursday-pub-quiz": ["quizNights"],
  "strangers-supper": ["supper"],
  "carter-road-run": ["runClubs"],
  "bandra-pub-crawl": ["nightlife"],
  "pickleball-social": ["racketSports", "pickleball"],
  "saturday-game-night": ["quizNights"],
  "run-and-rave": ["runClubs", "nightlife"],
  "sunday-board-games": [],
  "doubles-ladder": ["racketSports", "pickleball"],
  "rooftop-social": ["nightlife"],
  "long-table-supper": ["supper"],
};
const organizerFormats: Readonly<Record<string, readonly DiscoveryFormatKey[]>> = {
  "quizzicals": ["quizNights"],
  "khar-table": ["supper"],
  "carter-road-runners": ["runClubs"],
  "night-shift-socials": ["nightlife", "runClubs"],
  "dink-and-drink": ["racketSports", "pickleball"],
  "bandra-book-swap": ["books"],
  "koregaon-park-runners": ["runClubs"],
  "pune-board-gamers": [],
};

const page = (format: DiscoveryFormatKey, organizerCount: number, upcomingEventCount: number, freeEventCount: number,
  launched = true): DiscoveryFormatPage => ({
  slug: discoveryFormatSlugs[discoveryFormatKeys.indexOf(format)],
  organizerCount,
  upcomingEventCount,
  freeEventCount,
  indexing: launched && (organizerCount >= 3 || upcomingEventCount >= 5) ? "index, follow" : "noindex, follow",
});

function formatPages(counts: Partial<Record<DiscoveryFormatKey, [number, number, number]>>, launched: boolean) {
  return Object.fromEntries(discoveryFormatKeys.map((format) => {
    const [organisers, upcoming, free] = counts[format] ?? [0, 0, 0];
    return [format, page(format, organisers, upcoming, free, launched)];
  })) as Record<DiscoveryFormatKey, DiscoveryFormatPage>;
}

function withDiscovery(catalog: HomeCatalog, fields: DiscoveryCityFields): HomeCatalog {
  const plans: DiscoveryPlan[] = catalog.plans.plans.map((plan) => ({...plan, discoveryFormats: planFormats[plan.eventId] ?? []}));
  const organizers: DiscoveryOrganizer[] = catalog.plans.organizers.map((organizer) =>
    ({...organizer, discoveryFormats: organizerFormats[organizer.organizerId] ?? []}));
  return {...catalog, plans: {...catalog.plans, ...fields, plans, organizers}};
}

const monthWindowEnd = new Date(homeStoryReadAt + 30 * 864e5).toISOString();

/** Mumbai with its format pages: run clubs and nightlife above the indexing bar, pickleball and the rest below it. */
export const mumbaiDiscoveryCatalog = withDiscovery(mumbaiLiveCatalog, {
  monthWindowEnd,
  upcomingEvents30d: 23,
  hasUpcomingMonth: true,
  monthCountsComplete: true,
  formatPages: formatPages({
    runClubs: [4, 6, 2], nightlife: [3, 5, 0], quizNights: [2, 4, 1], supper: [2, 3, 0],
    racketSports: [1, 2, 0], pickleball: [1, 2, 0], books: [1, 0, 0],
  }, true),
});

/** Mumbai with nothing this week: only the supper nine days out, the week quiet. */
export const mumbaiQuietCatalog: HomeCatalog = (() => {
  const later = mumbaiDiscoveryCatalog.plans.plans.filter((plan) => plan.eventId === "long-table-supper");
  return {...mumbaiDiscoveryCatalog, plans: {...mumbaiDiscoveryCatalog.plans, plans: later, planCount: later.length}};
})();

/** Mumbai with nothing in the next 30 days: What's on leaves the header. */
export const mumbaiEmptyMonthCatalog: HomeCatalog = {
  ...mumbaiDiscoveryCatalog,
  plans: {...mumbaiDiscoveryCatalog.plans, plans: [], planCount: 0, upcomingEvents30d: 0, hasUpcomingMonth: false} as HomeCatalog["plans"],
};

/** Pune, not open yet: every format page is noindex whatever its counts. */
export const puneDiscoveryCatalog = withDiscovery(puneLaunchingSoonCatalog, {
  monthWindowEnd,
  upcomingEvents30d: 0,
  hasUpcomingMonth: false,
  monthCountsComplete: true,
  formatPages: formatPages({runClubs: [1, 0, 0]}, false),
});
