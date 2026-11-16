import assert from "node:assert/strict";
import test from "node:test";
import {contractFile} from "../shared/contractFixtures";
import {
  discoveryActivityKinds,
  discoveryFormats,
  discoveryFormatsForEvent,
  discoveryFormatsForText,
  discoveryFormatSlugs,
  discoveryKeywords,
  formatPageIndexing,
  formatPageIndexingFor,
} from "./discoveryFormats";

type Schema = {
  definitions: Record<string, {enum?: string[];
    properties?: Record<string, {enum?: string[]}>}>;
  properties: Record<string, {required?: string[]}>;
};

test("every event activity kind has an explicit format mapping", () => {
  const common = contractFile("shared/event_common.schema.json") as Schema;
  assert.deepEqual(Object.keys(discoveryActivityKinds).sort(),
    [...(common.definitions.activityKind.enum ?? [])].sort());
  assert.deepEqual(discoveryActivityKinds, {
    socialRun: ["runClubs"],
    running: ["runClubs"],
    walking: ["runClubs"],
    pickleball: ["racketSports", "pickleball"],
    padel: ["racketSports", "padel"],
    tennis: ["racketSports", "tennis"],
    badminton: ["racketSports", "badminton"],
    cycling: ["outdoors"],
    spinClass: ["studios"],
    yoga: ["studios"],
    strengthTraining: ["studios"],
    pubQuiz: ["quizNights"],
    barCrawl: ["nightlife"],
    dinner: ["supperClubs"],
    singlesMixer: [],
    openActivity: [],
  });
});

test("the formats and their page slugs match the city plans contract", () => {
  const schema = contractFile("firestore/city_plans.schema.json") as Schema;
  assert.deepEqual(schema.definitions.discoveryFormat.enum,
    [...discoveryFormats]);
  assert.deepEqual(schema.properties.formatPages.required,
    [...discoveryFormats]);
  assert.deepEqual(schema.definitions.formatPage.properties?.slug.enum,
    discoveryFormats.map((format) => discoveryFormatSlugs[format]));
  const slugs = Object.values(discoveryFormatSlugs);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z]+(?:-[a-z]+)*$/);
  for (const format of discoveryFormats) {
    assert.ok(discoveryKeywords[format].length > 0, format);
  }
});

test("each activity kind counts toward its own formats", () => {
  assert.deepEqual(discoveryFormatsForEvent("walking", []), ["runClubs"]);
  assert.deepEqual(discoveryFormatsForEvent("padel", ["bookClubs"]),
    ["racketSports", "padel"]);
  assert.deepEqual(discoveryFormatsForEvent("yoga", []), ["studios"]);
  assert.deepEqual(discoveryFormatsForEvent("cycling", []), ["outdoors"]);
  assert.deepEqual(discoveryFormatsForEvent("dinner", []), ["supperClubs"]);
  assert.deepEqual(discoveryFormatsForEvent("pubQuiz", []), ["quizNights"]);
  assert.deepEqual(discoveryFormatsForEvent("barCrawl", []), ["nightlife"]);
});

test("an open activity takes its organiser's listed formats", () => {
  assert.deepEqual(discoveryFormatsForEvent("openActivity",
    ["workshops", "bookClubs"]), ["workshops", "bookClubs"]);
  assert.deepEqual(discoveryFormatsForEvent("openActivity", []), []);
  assert.deepEqual(discoveryFormatsForEvent("singlesMixer", ["nightlife"]),
    ["nightlife"]);
  assert.deepEqual(discoveryFormatsForEvent("somethingNew", ["studios"]),
    ["studios"]);
  assert.deepEqual(discoveryFormatsForEvent("constructor", ["studios"]),
    ["studios"]);
});

test("listed categories and formats name the formats they mean", () => {
  const cases: [string, string[]][] = [
    ["Run club", ["runClubs"]],
    ["Walking group", ["runClubs"]],
    ["Trail runs", ["runClubs", "outdoors"]],
    ["Pickleball socials", ["racketSports", "pickleball"]],
    ["Padel and tennis", ["racketSports", "padel", "tennis"]],
    ["Table tennis league", ["racketSports"]],
    ["table-tennis", ["racketSports"]],
    ["Supper club", ["supperClubs"]],
    ["Long-table dinners", ["supperClubs"]],
    ["Pub quiz nights", ["quizNights"]],
    ["Pub quizzes and pub crawls", ["quizNights", "nightlife"]],
    ["Board-game cafe", ["quizNights"]],
    ["Boardgames", ["quizNights"]],
    ["Mixers and socials", ["nightlife"]],
    ["nightsOut", ["nightlife"]],
    ["Yoga studio", ["studios"]],
    ["HIIT and pilates", ["studios"]],
    ["Pottery workshops", ["workshops"]],
    ["Candle-making", ["workshops"]],
    ["Book club", ["bookClubs"]],
    ["Bookclub", ["bookClubs"]],
    ["Trekking and camping", ["outdoors"]],
    ["Event producer", []],
    ["beginner-friendly", []],
    ["Rerun screenings", []],
    ["Barbershop", []],
    ["Bartending", []],
  ];
  for (const [text, formats] of cases) {
    assert.deepEqual(discoveryFormatsForText([text]), formats, text);
  }
  assert.deepEqual(discoveryFormatsForText(["Book club", "Supper"]),
    ["supperClubs", "bookClubs"]);
});

test("a format page is indexed at 3 organisers or 5 upcoming plans", () => {
  assert.deepEqual(formatPageIndexing,
    {minOrganizers: 3, minUpcomingEvents: 5});
  const cases: [boolean, number, number, string][] = [
    [true, 0, 0, "noindex, follow"],
    [true, 2, 0, "noindex, follow"],
    [true, 0, 4, "noindex, follow"],
    [true, 2, 4, "noindex, follow"],
    [true, 3, 0, "index, follow"],
    [true, 0, 5, "index, follow"],
    [true, 3, 5, "index, follow"],
    [true, 40, 200, "index, follow"],
    [false, 3, 5, "noindex, follow"],
    [false, 40, 200, "noindex, follow"],
  ];
  for (const [launched, organizers, events, indexing] of cases) {
    assert.equal(formatPageIndexingFor(launched, organizers, events),
      indexing, `${launched} ${organizers} ${events}`);
  }
});
