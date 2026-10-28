import {activeMarket} from "@content/markets";
import {homeCatalogFromPlans} from "../../features/home/homeCatalog";
import type {HomeCatalog, HomeCityPlans, HomeFormat, HomeOrganizer, HomePlan} from "../../features/home/homeTypes";

/**
 * The WebHomeV2 board's cities as cityPlans read models: Mumbai live with its
 * week of plans and organisers, Pune launching soon with organisers joining,
 * and the other market cities empty. Times are fixed to the story clock.
 */
export const homeStoryReadAt = Date.parse("2026-10-29T06:30:00.000Z"); // Thu 12:00 IST
const ist = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 29 + day, hour - 5, minute - 30)).toISOString();

type Seed = [id: string, format: HomeFormat, title: string, host: string, where: string, start: string, price: string, left: number | null, photo?: string];
const organizerIds: Record<string, string> = {
  "The Quizzicals": "quizzicals", "Khar Table": "khar-table", "Carter Road Runners": "carter-road-runners",
  "Night Shift Socials": "night-shift-socials", "Dink and Drink": "dink-and-drink", "Evening Club": "evening-club",
  "Night Shift Runners": "night-shift-runners", "Bandra Boardroom": "bandra-boardroom",
};
const activity: Record<HomeFormat, string> = {run: "socialRun", dinner: "dinner", games: "pubQuiz", courts: "pickleball", nightsOut: "barCrawl", other: "openActivity"};

const seeds: Seed[] = [
  ["thursday-pub-quiz", "games", "Thursday Evening Pub Quiz", "The Quizzicals", "Khar Social", ist(0, 19, 30), "Free", 6],
  ["strangers-supper", "dinner", "Strangers’ Supper", "Khar Table", "Khar West", ist(0, 20, 30), "₹1,800", 2, "/assets/marketing/home-dinner.jpg"],
  ["carter-road-run", "run", "Carter Road Social Run", "Carter Road Runners", "Carter Road, Bandra", ist(1, 6, 30), "Free", 9, "/assets/events/social-run-music-hero-960.jpg"],
  ["bandra-pub-crawl", "nightsOut", "Friday Bandra Pub Crawl", "Night Shift Socials", "Four stops in Bandra", ist(1, 19, 30), "₹999", 11],
  ["pickleball-social", "courts", "Pickleball Social", "Dink and Drink", "Andheri West", ist(2, 17), "₹450", 8],
  ["saturday-game-night", "games", "Saturday Game Night", "Evening Club", "Harbour Room, Bandra West", ist(2, 18, 30), "₹600", 6],
  ["run-and-rave", "run", "Run and Rave", "Night Shift Runners", "Worli Sea Face", ist(2, 20), "₹499", 14],
  ["sunday-board-games", "games", "Sunday Board Games", "Bandra Boardroom", "Pali Hill", ist(3, 16), "₹350", 10],
  ["doubles-ladder", "courts", "Doubles Ladder Night", "Dink and Drink", "Khar Gymkhana", ist(3, 19), "₹500", 0],
  ["rooftop-social", "nightsOut", "Rooftop Social", "Night Shift Socials", "Lower Parel", ist(2, 21), "₹799", 18],
  ["long-table-supper", "dinner", "Long Table Supper", "Khar Table", "Worli", ist(9, 20), "₹2,200", 4],
];

const mumbaiPlans: HomePlan[] = seeds.map(([id, format, title, host, location, startTime, priceLabel, spotsLeft, photoUrl]): HomePlan => ({
  source: "catch", eventId: id, path: `/events/${id}/`, title, format, activityKind: activity[format],
  startTime, endTime: null, date: startTime, location, priceLabel, photoUrl: photoUrl ?? null, spotsLeft,
  organizer: {organizerId: organizerIds[host], name: host, path: `/organizers/${organizerIds[host]}/`},
})).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

function organizer(id: string, name: string, category: string, formats: HomeFormat[], followerCount: number,
  claimState: HomeOrganizer["claimState"], path: string | null): HomeOrganizer {
  const own = mumbaiPlans.filter((plan) => plan.organizer.organizerId === id);
  const next = own[0];
  return {
    organizerId: id, name, path, category, formats, followerCount, claimState,
    logo: {mode: "monogram", text: name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(), status: "verified"},
    upcomingPlanCount: own.length,
    nextPlan: next ? {eventId: next.eventId, path: next.path, title: next.title, startTime: next.startTime, date: next.date} : null,
  };
}

const counts = (plans: readonly HomePlan[]) => {
  const result: Record<HomeFormat, number> = {run: 0, dinner: 0, games: 0, courts: 0, nightsOut: 0, other: 0};
  for (const plan of plans) result[plan.format]++;
  return result;
};

const window = {windowStart: new Date(homeStoryReadAt).toISOString(), windowEnd: new Date(homeStoryReadAt + 14 * 864e5).toISOString()};

export const mumbaiPlansFixture: HomeCityPlans = {
  citySlug: "mumbai", cityLabel: "Mumbai", marketStatus: "launched", status: "live", ...window,
  planCount: mumbaiPlans.length, formatCounts: counts(mumbaiPlans), plans: mumbaiPlans,
  organizers: [
    organizer("quizzicals", "The Quizzicals", "Trivia nights and socials", ["games"], 74, "claimed", "/organizers/quizzicals/"),
    organizer("khar-table", "Khar Table", "Supper clubs for strangers", ["dinner"], 58, "verified", "/organizers/khar-table/"),
    organizer("carter-road-runners", "Carter Road Runners", "Sunday social runs", ["run"], 212, "verified", "/organizers/carter-road-runners/"),
    organizer("night-shift-socials", "Night Shift Socials", "Pub crawls and late runs", ["nightsOut", "run"], 140, "claimed", "/organizers/night-shift-socials/"),
    organizer("dink-and-drink", "Dink and Drink", "Pickleball socials", ["courts"], 96, "claimed", "/organizers/dink-and-drink/"),
    organizer("bandra-book-swap", "Bandra Book Swap", "Monthly book swaps", [], 0, "unclaimed", "/organizers/bandra-book-swap/"),
  ],
};

const empty = (citySlug: string, cityLabel: string, marketStatus: HomeCityPlans["marketStatus"]): HomeCityPlans => ({
  citySlug, cityLabel, marketStatus, status: "launchingSoon", ...window, planCount: 0, formatCounts: counts([]), plans: [], organizers: [],
});

export const punePlansFixture: HomeCityPlans = {
  ...empty("pune", "Pune", "planned"),
  organizers: [
    {...organizer("koregaon-park-runners", "Koregaon Park Runners", "Saturday social runs", ["run"], 0, "claimed", null)},
    {...organizer("pune-board-gamers", "Pune Board Gamers", "Board game nights", ["games", "dinner"], 0, "claimed", null)},
  ],
};

const byCity: Record<string, HomeCityPlans> = {
  mumbai: mumbaiPlansFixture,
  indore: empty("indore", "Indore", "launched"),
  "delhi-ncr": empty("delhi-ncr", "Delhi NCR", "planned"),
  bengaluru: empty("bengaluru", "Bengaluru", "planned"),
  pune: punePlansFixture,
  hyderabad: empty("hyderabad", "Hyderabad", "planned"),
};

export function homeCatalogFixture(city: string): HomeCatalog {
  return homeCatalogFromPlans(activeMarket.cities, activeMarket.cities.map((market) => byCity[market.marketSlug]), city, homeStoryReadAt);
}

export const mumbaiLiveCatalog = homeCatalogFixture("mumbai");
export const puneLaunchingSoonCatalog = homeCatalogFixture("pune");
