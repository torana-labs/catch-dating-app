import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {mumbaiLiveCatalog} from "../../stories/fixtures/homeCatalogs";
import {mumbaiDiscoveryCatalog, mumbaiEmptyMonthCatalog, mumbaiQuietCatalog, puneDiscoveryCatalog} from "./discoveryCatalogFixtures";
import {
  cityFormatModel,
  cityFormatPageStatus,
  filterFormatPlans,
  matchDiscoveryRoute,
  newcomerPlans,
  showWhatsOnFor,
} from "./discoveryModel";
import {discoveryFormatKeys, discoveryFormatSlugs} from "./discoveryTypes";

// The read model's contract is the taxonomy's owner; the website mirrors it.
const schema = JSON.parse(readFileSync(resolve(process.cwd(), "../contracts/firestore/city_plans.schema.json"), "utf8")) as {
  definitions: {discoveryFormat: {enum: string[]}; formatPage: {properties: {slug: {enum: string[]}}}};
  properties: {formatPages: {required: string[]}};
};

describe("discovery taxonomy", () => {
  it("is the cityPlans contract's formats and format page slugs, in order", () => {
    expect([...discoveryFormatKeys]).toEqual(schema.definitions.discoveryFormat.enum);
    expect([...discoveryFormatKeys]).toEqual(schema.properties.formatPages.required);
    expect([...discoveryFormatSlugs]).toEqual(schema.definitions.formatPage.properties.slug.enum);
  });
});

describe("matchDiscoveryRoute", () => {
  it("names a website city's format page by the backend's slug", () => {
    expect(matchDiscoveryRoute("/mumbai/run-clubs/")).toEqual({kind: "cityFormat", citySlug: "mumbai", format: "runClubs", canonicalPath: "/mumbai/run-clubs/"});
    expect(matchDiscoveryRoute("/indore/quiz-nights")).toEqual({kind: "cityFormat", citySlug: "indore", format: "quizNights", canonicalPath: "/indore/quiz-nights/"});
  });

  it("names a website city's new-to-the-city page, hyphenated slugs included", () => {
    expect(matchDiscoveryRoute("/new-to-mumbai/")).toEqual({kind: "newToCity", citySlug: "mumbai", canonicalPath: "/new-to-mumbai/"});
    expect(matchDiscoveryRoute("/new-to-delhi-ncr/?utm_source=ig")).toEqual({kind: "newToCity", citySlug: "delhi-ncr", canonicalPath: "/new-to-delhi-ncr/"});
  });

  it("leaves every other path to the other routes", () => {
    for (const path of ["/mumbai/", "/mumbai/singles/", "/atlantis/run-clubs/", "/new-to-atlantis/", "/host/run-clubs/", "/mumbai/run-clubs/extra/"]) {
      expect(matchDiscoveryRoute(path)).toBeNull();
    }
  });
});

describe("city format pages", () => {
  it("read the backend's counts, indexing and tagged plans and organisers", () => {
    const runs = cityFormatModel(mumbaiDiscoveryCatalog, "runClubs");
    expect(runs.page).toMatchObject({slug: "run-clubs", organizerCount: 4, upcomingEventCount: 6, freeEventCount: 2, indexing: "index, follow"});
    expect(runs.indexed).toBe(true);
    expect(runs.plans.map((plan) => plan.eventId)).toEqual(["carter-road-run", "run-and-rave"]);
    expect(runs.organizers.map((organizer) => organizer.organizerId)).toEqual(["carter-road-runners", "night-shift-socials"]);
    // Other indexed format pages in the city, and the busiest formats for the thin card.
    expect(runs.links.map((link) => link.href)).toEqual(["/mumbai/nightlife/"]);
    expect(runs.popular.map((item) => item.format)).toEqual(["nightlife", "quizNights", "supperClubs", "racketSports"]);
  });

  it("are noindex below the bar and in a city not open yet", () => {
    expect(cityFormatModel(mumbaiDiscoveryCatalog, "pickleball").indexed).toBe(false);
    expect(cityFormatModel(puneDiscoveryCatalog, "runClubs").page?.indexing).toBe("noindex, follow");
  });

  it("render only with format pages to read, and not when the format has nothing in the city", () => {
    expect(cityFormatPageStatus(mumbaiDiscoveryCatalog, "runClubs")).toBe("page");
    expect(cityFormatPageStatus(mumbaiDiscoveryCatalog, "tennis")).toBe("notFound");
    // Read from the public catalog instead of its document: no counts to show, never invented ones.
    expect(cityFormatPageStatus(mumbaiLiveCatalog, "runClubs")).toBe("unavailable");
    expect(cityFormatPageStatus({...mumbaiDiscoveryCatalog, phase: "unavailable"}, "runClubs")).toBe("unavailable");
  });

  it("filter free and weekend plans in the city's time zone", () => {
    const plans = mumbaiDiscoveryCatalog.plans.plans;
    expect(filterFormatPlans(plans, "free", "Asia/Kolkata").map((plan) => plan.eventId)).toEqual(["thursday-pub-quiz", "carter-road-run"]);
    // The fixture clock is Thursday in Mumbai: both weekends of the next two weeks, the supper nine days out on the second Saturday.
    expect(filterFormatPlans(plans, "weekend", "Asia/Kolkata").map((plan) => plan.eventId)).toEqual(
      ["pickleball-social", "saturday-game-night", "run-and-rave", "rooftop-social", "sunday-board-games", "doubles-ladder", "long-table-supper"]);
  });
});

describe("What's on in the header", () => {
  it("hides only when the read model says nothing is on in the next 30 days", () => {
    expect(showWhatsOnFor(mumbaiDiscoveryCatalog.plans)).toBe(true);
    expect(showWhatsOnFor(mumbaiEmptyMonthCatalog.plans)).toBe(false);
    // A city read without the 30-day field keeps it, as before the field existed.
    expect(showWhatsOnFor(mumbaiLiveCatalog.plans)).toBe(true);
  });
});

describe("newcomer plans", () => {
  it("are this week's plans where the host makes the groups", () => {
    const found = newcomerPlans(mumbaiDiscoveryCatalog);
    expect(found.quiet).toBe(false);
    expect(found.plans.map((plan) => plan.eventId)).toEqual(["thursday-pub-quiz", "strangers-supper", "carter-road-run", "saturday-game-night", "run-and-rave"]);
  });

  it("move to the next two weeks when this week is quiet", () => {
    const found = newcomerPlans(mumbaiQuietCatalog);
    expect(found.quiet).toBe(true);
    expect(found.plans.map((plan) => plan.eventId)).toEqual(["long-table-supper"]);
  });
});
