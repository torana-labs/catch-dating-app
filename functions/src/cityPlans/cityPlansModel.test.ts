import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {validateCityPlansDocument} from
  "../shared/generated/validators/cityPlansDocument";
import type {HostListing} from "../publicPages/publicOrganizer";
import {pageLimits} from "../publicPages/pageModel";
import {
  buildCityPlans,
  cityPlanLimits,
  formatActivityKinds,
  formatForActivity,
  formatsForText,
  isFree,
  type CityMarket,
  type CityOrganizerPage,
  type CityPlans,
} from "./cityPlansModel";
import {discoveryFormats} from "./discoveryFormats";
import {cityMarket, cityMarkets} from "./rebuild";
import {contractFixture} from "../shared/contractFixtures";

type Row = Record<string, unknown>;
const hour = 60 * 60 * 1000;
const now = Date.parse("2026-10-28T06:00:00.000Z");
const mumbai: CityMarket = {slug: "mumbai", label: "Mumbai",
  launchStatus: "launched"};
const pune: CityMarket = {slug: "pune", label: "Pune",
  launchStatus: "planned"};

const fixturePage = JSON.parse(JSON.stringify(
  // The valid organizer page fixture, one upcoming Catch event as a base.
  (contractFixture("organizer_public_page_doc")))) as Row;
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
  assert.deepEqual(city.formatCounts, {run: 2, dinner: 0,
    games: 1, courts: 0, nightsOut: 1, other: 1});
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
  assert.ok(carter.formats.includes("run"));
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

const formatPagesOf = (city: CityPlans) => Object.fromEntries(
  discoveryFormats.map((format) => [format,
    [city.formatPages[format].organizerCount,
      city.formatPages[format].upcomingEventCount,
      city.formatPages[format].freeEventCount]]));

test("format pages count organisers, plans and free plans in 30 days", () => {
  const city = buildCityPlans({market: mumbai, now,
    organizerPages: livePages(), joiningOrganizers: []});
  const counts = formatPagesOf(city);
  // carter: two runs; quiz: a quiz in 14 days and one at 15 days; night: a
  // crawl and a yoga class. The elsewhere page is in Indore.
  assert.deepEqual(counts.runClubs, [1, 2, 2]);
  assert.deepEqual(counts.quizNights, [1, 2, 2]);
  assert.deepEqual(counts.nightlife, [1, 1, 1]);
  assert.deepEqual(counts.studios, [1, 1, 1]);
  assert.deepEqual(counts.supper, [0, 0, 0]);
  assert.equal(city.formatPages.runClubs.slug, "run-clubs");
  assert.equal(city.formatPages.books.slug, "book-clubs");
  assert.equal(city.upcomingEvents30d, 6);
  assert.equal(city.hasUpcomingMonth, true);
  assert.equal(city.monthCountsComplete, true);
  assert.equal(city.monthWindowEnd,
    new Date(now + cityPlanLimits.monthWindowDays * day).toISOString());
  assert.deepEqual(city.plans.find((plan) => plan.eventId === "yoga-1")
    ?.discoveryFormats, ["studios"]);
  assert.deepEqual(city.organizers.find((org) => org.organizerId ===
    "night")?.discoveryFormats, ["nightlife", "studios"]);
});

test("format page counts are not capped by the listed plans and organisers",
  () => {
    const pages = Array.from({length: 30}, (_, index) => page(`org-${index}`,
      Array.from({length: 6}, (_, slot) => event(`run-${index}-${slot}`,
        (slot + 1) * day + index * 60_000))));
    const city = buildCityPlans({market: mumbai, now, organizerPages: pages,
      joiningOrganizers: []});
    assert.equal(city.organizers.length, cityPlanLimits.organizers);
    assert.equal(city.plans.length, cityPlanLimits.plans);
    assert.equal(city.planCount, 180);
    assert.equal(city.upcomingEvents30d, 180);
    assert.deepEqual(formatPagesOf(city).runClubs, [30, 180, 180]);
    assert.ok(validateCityPlansDocument(stored(city)),
      JSON.stringify(validateCityPlansDocument.errors));
  });

test("the 30-day signal takes plans starting before day 30 that have not " +
  "ended", () => {
  const signal = (events: Row[]) => {
    const city = buildCityPlans({market: mumbai, now, joiningOrganizers: [],
      organizerPages: [page("carter", events)]});
    return [city.upcomingEvents30d, city.hasUpcomingMonth, city.planCount];
  };
  assert.deepEqual(signal([]), [0, false, 0]);
  // Past the 14-day plans, still in the month.
  assert.deepEqual(signal([event("day-20", 20 * day)]), [1, true, 0]);
  assert.deepEqual(signal([event("edge", 30 * day - 1)]), [1, true, 0]);
  assert.deepEqual(signal([event("day-30", 30 * day)]), [0, false, 0]);
  assert.deepEqual(signal([event("ended", -2 * hour)]), [0, false, 0]);
  // Started half an hour ago and still running.
  assert.deepEqual(signal([event("running", -hour / 2)]), [1, true, 1]);
  assert.deepEqual(signal([event("cancelled", day, "socialRun",
    {timeline: "past"})]), [0, false, 0]);
});

test("a full organiser page marks the month's counts as a floor", () => {
  const full = (spacing: number) => buildCityPlans({market: mumbai, now,
    joiningOrganizers: [], organizerPages: [page("daily",
      Array.from({length: pageLimits.upcomingEvents}, (_, index) =>
        event(`run-${index}`, (index + 1) * spacing)))]});
  // Fifty plans 12 hours apart all start inside the month.
  assert.equal(full(12 * hour).monthCountsComplete, false);
  // Fifty plans a day apart run past it, so none are missing.
  assert.equal(full(day).monthCountsComplete, true);
  assert.equal(full(day).upcomingEvents30d, 29);
});

test("free plans are those a guest pays nothing for", () => {
  const priced = (extra: Row) => event("priced", day, "socialRun", extra);
  const external = (priceLabel: string) => ({
    source: "external", eventId: "ext", path: "/events/ext/",
    event: {id: "ext", title: "Imported", activityKind: "socialRun",
      startTime: new Date(now + day).toISOString(), endTime: null,
      priceLabel},
    booking: {kind: "external", url: "https://example.test/", label: "Luma"},
  });
  const free = (item: Row) => isFree(item as never);
  assert.equal(free(priced({amountPaise: 0, priceLabel: "Free"})), true);
  assert.equal(free(priced({amountPaise: 19900, priceLabel: "₹199"})), false);
  assert.equal(free(priced({amountPaise: 0, priceLabel: "Free",
    priceHidden: true})), false);
  assert.equal(free(priced({amountPaise: undefined, priceLabel: "Free"})),
    true);
  for (const label of ["Free", " free ", "0 INR", "INR 0", "₹0", "Rs. 0",
    "₹0.00"]) assert.equal(free(external(label)), true, label);
  for (const label of ["₹200", "External ticketing", "Free for members",
    "0-500 INR", "₹10"]) assert.equal(free(external(label)), false, label);

  const city = buildCityPlans({market: mumbai, now, joiningOrganizers: [],
    organizerPages: [page("carter", [
      priced({amountPaise: 0, priceLabel: "Free"}),
      event("paid", 2 * day, "socialRun", {amountPaise: 29900,
        priceLabel: "₹299"}),
      external("0 INR") as Row])]});
  assert.deepEqual(formatPagesOf(city).runClubs, [1, 3, 2]);
});

test("open activities count toward the formats their organiser lists", () => {
  const books = page("readers", [event("meet-1", day, "openActivity"),
    event("meet-2", 2 * day, "openActivity")],
  {identity: {category: "Book club", formats: ["Monthly reads"]}});
  const pottery = page("clay", [event("throw-1", day, "openActivity")],
    {identity: {category: "Pottery workshops", formats: []}});
  const unnamed = page("misc", [event("open-1", day, "openActivity")],
    {identity: {category: "Community", formats: ["beginner-friendly"]}});
  const courts = page("courts", [event("padel-1", day, "padel")],
    {identity: {category: "Sports club", formats: []}});
  const city = buildCityPlans({market: mumbai, now, joiningOrganizers: [],
    organizerPages: [books, pottery, unnamed, courts]});
  const counts = formatPagesOf(city);
  assert.deepEqual(counts.books, [1, 2, 2]);
  assert.deepEqual(counts.workshops, [1, 1, 1]);
  assert.deepEqual(counts.racketSports, [1, 1, 1]);
  assert.deepEqual(counts.padel, [1, 1, 1]);
  assert.deepEqual(counts.pickleball, [0, 0, 0]);
  // An open activity from an organiser that names no format counts toward
  // the month but toward no format page.
  assert.equal(city.upcomingEvents30d, 5);
  assert.deepEqual(city.plans.find((plan) => plan.eventId === "open-1")
    ?.discoveryFormats, []);
});

test("a format page is indexed at 3 organisers or 5 plans", () => {
  const indexing = (organizers: number, plans: number) => {
    const pages = Array.from({length: organizers}, (_, index) =>
      page(`org-${index}`, index === 0 ? Array.from({length: plans},
        (_, slot) => event(`run-${slot}`, (slot + 1) * day)) : [],
      {identity: {category: "Run club", formats: []}}));
    return buildCityPlans({market: mumbai, now, organizerPages: pages,
      joiningOrganizers: []}).formatPages.runClubs.indexing;
  };
  assert.equal(indexing(0, 0), "noindex, follow");
  assert.equal(indexing(2, 4), "noindex, follow");
  assert.equal(indexing(3, 0), "index, follow");
  assert.equal(indexing(1, 5), "index, follow");
  assert.equal(indexing(1, 4), "noindex, follow");
  assert.equal(indexing(3, 5), "index, follow");
});

test("rebuilding the same sources gives the same city", () => {
  const build = (pages: CityOrganizerPage[]) => buildCityPlans({market: mumbai,
    now, organizerPages: pages, joiningOrganizers: []});
  const first = build(livePages());
  assert.deepEqual(build(livePages()), first);
  assert.deepEqual(build(livePages().reverse()), first);
});

test("a launched city with few plans stays live with its honest count", () => {
  const pages = [page("carter",
    [event("run-1", day), event("run-2", 2 * day)])];
  const city = buildCityPlans({market: mumbai, now, organizerPages: pages,
    joiningOrganizers: []});
  assert.equal(city.status, "live");
  assert.equal(city.planCount, 2);
  const empty = buildCityPlans({market: mumbai, now, organizerPages: [],
    joiningOrganizers: []});
  assert.equal(empty.status, "live");
  assert.equal(empty.planCount, 0);
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
    formats: ["run"], followerCount: 3, claimState: "unclaimed",
    upcomingPlanCount: 0, nextPlan: null, discoveryFormats: ["runClubs"]}]);
  // Joining organisers count toward their format; no page is indexed and
  // the header has nothing to show until the city launches.
  assert.equal(city.formatPages.runClubs.organizerCount, 1);
  assert.equal(city.formatPages.runClubs.indexing, "noindex, follow");
  assert.equal(city.upcomingEvents30d, 0);
  assert.equal(city.hasUpcomingMonth, false);
  assert.ok(validateCityPlansDocument(stored(city)),
    JSON.stringify(validateCityPlansDocument.errors));
});

test("a city that has not launched indexes no format page, however many " +
  "organisers join", () => {
  const joining = ["a", "b", "c", "d"].map((id) => ({
    id: `runners-${id}`, name: `Runners ${id}`, citySlug: "pune",
    category: "Run club", formats: [], logo: {mode: "monogram", text: "R",
      status: "not_verified"}, metrics: {followerCount: 0},
    authority: {claimState: "unclaimed"},
  }) as unknown as HostListing);
  const city = buildCityPlans({market: pune, now, organizerPages: [],
    joiningOrganizers: joining});
  assert.equal(city.formatPages.runClubs.organizerCount, 4);
  assert.equal(city.formatPages.runClubs.indexing, "noindex, follow");
});

test("activities and free-text formats map to homepage formats", () => {
  assert.equal(formatForActivity("socialRun"), "run");
  assert.equal(formatForActivity("dinner"), "dinner");
  assert.equal(formatForActivity("pubQuiz"), "games");
  assert.equal(formatForActivity("padel"), "courts");
  assert.equal(formatForActivity("barCrawl"), "nightsOut");
  assert.equal(formatForActivity("yoga"), "other");
  assert.deepEqual(formatsForText("Pub quiz nights"),
    ["games", "nightsOut"]);
  assert.deepEqual(formatsForText("Supper clubs for strangers"),
    ["dinner"]);
  assert.deepEqual(formatsForText("beginner-friendly"), []);
});

test("formats group activities as the website library draws them", () => {
  // packages/web-ui/src/components/palette.ts owns the drawn map.
  const palette = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
    "packages", "web-ui", "src", "components", "palette.ts"), "utf8");
  const block = /formatActivityKinds[^=]*=\s*\{([\s\S]*?)\};/
    .exec(palette)?.[1] ?? "";
  const drawn = Object.fromEntries([...block.matchAll(
    /(\w+):\s*\[([^\]]*)\]/g)].map(([, format, kinds]) => [format,
    [...kinds.matchAll(/"(\w+)"/g)].map(([, kind]) => kind)]));
  assert.deepEqual(drawn, formatActivityKinds);
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

test("format pages hold counts only, keyed by known formats", () => {
  const fixture = contractFixture("city_plans_doc") as CityPlans;
  const formatPages: CityPlans["formatPages"] = fixture.formatPages;
  assert.ok(validateCityPlansDocument(fixture),
    JSON.stringify(validateCityPlansDocument.errors));
  // The fixture is a launched city, so its indexing follows the rule.
  for (const format of discoveryFormats) {
    const entry = formatPages[format];
    assert.equal(entry.indexing, entry.organizerCount >= 3 ||
      entry.upcomingEventCount >= 5 ? "index, follow" : "noindex, follow",
    format);
  }
  const copy = () => JSON.parse(JSON.stringify(fixture)) as Row;
  const named = copy();
  (named.formatPages as Record<string, Row>).runClubs.organizers =
    ["next-proof"];
  assert.equal(validateCityPlansDocument(named), false);
  const unknown = copy();
  (unknown.formatPages as Record<string, Row>).speedDating =
    (unknown.formatPages as Record<string, Row>).runClubs;
  assert.equal(validateCityPlansDocument(unknown), false);
  const missing = copy();
  delete (missing.formatPages as Record<string, Row>).books;
  assert.equal(validateCityPlansDocument(missing), false);
  const wrongSlug = copy();
  (wrongSlug.formatPages as Record<string, Row>).runClubs.slug = "running";
  assert.equal(validateCityPlansDocument(wrongSlug), false);
  const noSignal = copy();
  delete noSignal.hasUpcomingMonth;
  assert.equal(validateCityPlansDocument(noSignal), false);
});

test("launched and planned markets have cities; retired ones do not", () => {
  assert.equal(cityMarket("mumbai")?.launchStatus, "launched");
  assert.equal(cityMarket("pune")?.launchStatus, "planned");
  assert.equal(cityMarket("nowhere"), null);
  assert.ok(cityMarkets.every((market) =>
    ["launched", "planned"].includes(market.launchStatus)));
});
