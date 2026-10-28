import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {validateCityPlansDocument} from
  "../shared/generated/validators/cityPlansDocument";
import {readPublicPageFixture} from "../publicPages/publicPageTestFixtures";
import type {HostListing} from "../publicPages/publicOrganizer";
import {
  buildCityPlans,
  cityPlanLimits,
  formatForActivity,
  formatsForText,
  type CityMarket,
  type CityOrganizerPage,
} from "./cityPlansModel";
import {cityMarket, cityMarkets} from "./rebuild";

type Row = Record<string, unknown>;
const hour = 60 * 60 * 1000;
const now = Date.parse("2026-10-28T06:00:00.000Z");
const mumbai: CityMarket = {slug: "mumbai", label: "Mumbai",
  launchStatus: "launched"};
const pune: CityMarket = {slug: "pune", label: "Pune",
  launchStatus: "planned"};

const fixturePage = JSON.parse(JSON.stringify(
  // The valid organizer page fixture, one upcoming Catch event as a base.
  (readPublicPageFixture("../valid/organizer_public_page_doc.json")))) as Row;
const baseEvent = (fixturePage.upcomingEvents as Row[])
  .find((item) => item.source === "catch") as Row;

function event(id: string, startsIn: number, activityKind = "socialRun",
  extra: Row = {}): Row {
  const start = new Date(now + startsIn).toISOString();
  const end = new Date(now + startsIn + hour).toISOString();
  return {
    ...baseEvent,
    eventId: id,
    path: `/events/${id}/`,
    event: {...(baseEvent.event as Row), id, title: `Plan ${id}`,
      activityKind, startTime: start, endTime: end, ...extra},
    booking: {...(baseEvent.booking as Row), path: `/events/${id}/`,
      spotsLeft: 6},
  };
}

function page(id: string, events: Row[], overrides: Row = {}):
  CityOrganizerPage {
  const identity = {...(fixturePage.identity as Row), name: `Org ${id}`,
    city: "Mumbai", citySlug: "mumbai", ...(overrides.identity as Row ?? {})};
  return {
    organizerId: id,
    path: `/organizers/${id}/`,
    identity,
    upcomingEvents: events,
    followerCount: Number(overrides.followerCount ?? 0),
    claim: {...(fixturePage.claim as Row), state: overrides.claimState ??
      "claimed"},
  } as unknown as CityOrganizerPage;
}

const day = 24 * hour;
const livePages = () => [
  page("carter", [event("run-1", day, "socialRun"),
    event("run-2", 3 * day, "running")], {followerCount: 212}),
  page("quiz", [event("quiz-1", 2 * day, "pubQuiz"),
    event("late", 15 * day, "pubQuiz")], {followerCount: 74}),
  page("night", [event("crawl-1", 4 * day, "barCrawl"),
    event("yoga-1", 5 * day, "yoga")], {followerCount: 140}),
  page("quiet", [], {followerCount: 900}),
  page("elsewhere", [event("indore-1", day)],
    {identity: {citySlug: "indore", city: "Indore"}}),
];

function stored(value: object) {
  return {...value, builtAt: Timestamp.fromMillis(now)};
}

test("a launched city lists its plans in the 14-day window", () => {
  const city = buildCityPlans({market: mumbai, now,
    organizerPages: livePages(), joiningOrganizers: []});
  assert.equal(city.status, "live");
  assert.deepEqual(city.plans.map((plan) => plan.eventId),
    ["run-1", "quiz-1", "run-2", "crawl-1", "yoga-1"]);
  assert.equal(city.planCount, 5);
  assert.deepEqual(city.formatCounts, {runClubs: 2, dinners: 0,
    gamesAndQuizzes: 1, pickleball: 0, nightsOut: 1, other: 1});
  assert.equal(city.windowEnd,
    new Date(now + cityPlanLimits.windowDays * day).toISOString());
  assert.deepEqual(city.plans[0].organizer, {organizerId: "carter",
    name: "Org carter", path: "/organizers/carter/"});
  assert.equal(city.plans[0].spotsLeft, 6);
  assert.ok(validateCityPlansDocument(stored(city)),
    JSON.stringify(validateCityPlansDocument.errors));
});

test("organisers with a plan come first, then by followers", () => {
  const city = buildCityPlans({market: mumbai, now,
    organizerPages: livePages(), joiningOrganizers: []});
  assert.deepEqual(city.organizers.map((org) => org.organizerId),
    ["carter", "quiz", "night", "quiet"]);
  const [carter, quiz, , quiet] = city.organizers;
  assert.equal(carter.upcomingPlanCount, 2);
  assert.deepEqual(carter.nextPlan && carter.nextPlan.eventId, "run-1");
  assert.ok(carter.formats.includes("runClubs"));
  // The plan beyond the window is not the next plan in it.
  assert.equal(quiz.upcomingPlanCount, 1);
  assert.equal(quiet.nextPlan, null);
  assert.equal(quiet.path, "/organizers/quiet/");
});

test("ended plans and other cities' plans are left out", () => {
  const pages = [page("carter", [event("ended", -2 * hour),
    event("run-1", day)])];
  const city = buildCityPlans({market: mumbai, now, organizerPages: pages,
    joiningOrganizers: []});
  assert.deepEqual(city.plans.map((plan) => plan.eventId), ["run-1"]);
});

test("a launched city too thin to fill a page reads as launching soon", () => {
  const pages = [page("carter", [event("run-1", day), event("run-2", 2 * day),
    event("run-3", 3 * day)])];
  const city = buildCityPlans({market: mumbai, now, organizerPages: pages,
    joiningOrganizers: []});
  assert.equal(cityPlanLimits.livePlanMinimum, 4);
  assert.equal(city.status, "launchingSoon");
  assert.equal(city.plans.length, 3);
});

test("a city that has not launched lists who is joining, with no pages", () => {
  const listing = {
    id: "kp-runners", name: "Koregaon Park Runners", citySlug: "pune",
    category: "Run club", formats: ["Saturday social runs"],
    logo: {mode: "monogram", text: "KP", status: "not_verified"},
    metrics: {followerCount: 3},
    authority: {claimState: "unclaimed"},
  } as unknown as HostListing;
  const city = buildCityPlans({market: pune, now,
    organizerPages: livePages(), joiningOrganizers: [listing,
      {...listing, id: "other-city", citySlug: "mumbai"} as HostListing]});
  assert.equal(city.status, "launchingSoon");
  assert.equal(city.marketStatus, "planned");
  assert.deepEqual(city.plans, []);
  assert.equal(city.planCount, 0);
  assert.deepEqual(city.organizers, [{organizerId: "kp-runners",
    name: "Koregaon Park Runners", path: null, category: "Run club",
    logo: {mode: "monogram", text: "KP", status: "not_verified"},
    formats: ["runClubs"], followerCount: 3, claimState: "unclaimed",
    upcomingPlanCount: 0, nextPlan: null}]);
  assert.ok(validateCityPlansDocument(stored(city)),
    JSON.stringify(validateCityPlansDocument.errors));
});

test("activities and free-text formats map to homepage formats", () => {
  assert.equal(formatForActivity("socialRun"), "runClubs");
  assert.equal(formatForActivity("dinner"), "dinners");
  assert.equal(formatForActivity("pubQuiz"), "gamesAndQuizzes");
  assert.equal(formatForActivity("padel"), "pickleball");
  assert.equal(formatForActivity("barCrawl"), "nightsOut");
  assert.equal(formatForActivity("yoga"), "other");
  assert.deepEqual(formatsForText("Pub quiz nights"),
    ["gamesAndQuizzes", "nightsOut"]);
  assert.deepEqual(formatsForText("Supper clubs for strangers"),
    ["dinners"]);
  assert.deepEqual(formatsForText("beginner-friendly"), []);
});

test("dating framing never reaches a city document", () => {
  const city = buildCityPlans({market: mumbai, now, organizerPages: livePages(),
    joiningOrganizers: []});
  const mixer = {...city, plans: [{...city.plans[0],
    activityKind: "singlesMixer"}]};
  assert.equal(validateCityPlansDocument(stored(mixer)), false);
  const contact = {...city, organizers: [{...city.organizers[0],
    phone: "+919876543210"}]};
  assert.equal(validateCityPlansDocument(stored(contact)), false);
});

test("launched and planned markets have cities; retired ones do not", () => {
  assert.equal(cityMarket("mumbai")?.launchStatus, "launched");
  assert.equal(cityMarket("pune")?.launchStatus, "planned");
  assert.equal(cityMarket("nowhere"), null);
  assert.ok(cityMarkets.every((market) =>
    ["launched", "planned"].includes(market.launchStatus)));
});
