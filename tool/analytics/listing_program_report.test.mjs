import assert from "node:assert/strict";
import test from "node:test";
import {
  buildListingProgramReport,
  evaluatePause,
  main,
  millis,
  readListingProgramSources,
  renderListingProgramReport,
} from "./listing_program_report.mjs";

// Fictional organisers and cohorts only.
const now = Date.parse("2026-12-20T06:00:00.000Z");
const day = 24 * 60 * 60 * 1000;
const ago = (days) => now - days * day;

function organizer(id, cohortId, publishStatus = "published", citySlug = "indore") {
  return {id, cohortId, publishStatus, citySlug};
}

function sources(overrides = {}) {
  const pilot = Array.from({length: 12}, (_, index) =>
    organizer(`lantern-lane-social-${index}`, "indore-pilot-1"));
  pilot[10].publishStatus = "suppressed";
  pilot[11].publishStatus = "draft";
  return {
    organizers: [...pilot, organizer("quiet-quarter-quiz", "mumbai-wave-1", "published", "mumbai")],
    takedownRequests: [
      {organizerId: "lantern-lane-social-0", requestType: "correctFact", status: "actioned", createdAt: ago(3)},
      {organizerId: "lantern-lane-social-1", requestType: "claim", status: "received", createdAt: ago(1)},
      // An organiser outside every cohort never counts.
      {organizerId: "not-in-a-cohort", requestType: "legalOrder", status: "received", createdAt: ago(1)},
    ],
    claimRequests: [
      {organizerId: "lantern-lane-social-1", status: "pending"},
      {organizerId: "lantern-lane-social-2", status: "approved"},
      {organizerId: "quiet-quarter-quiz", status: "rejected"},
    ],
    fieldCorrections: [{organizerId: "lantern-lane-social-0"}, {organizerId: "lantern-lane-social-3"}],
    listingSuppressions: [
      {active: true, blockedIntakeCount: 3, lastBlockedAt: ago(4)},
      {active: true, blockedIntakeCount: 1, lastBlockedAt: ago(45)},
      {active: false, blockedIntakeCount: 9, lastBlockedAt: ago(2)},
    ],
    cityPlans: [{citySlug: "indore", indexedFormatPages: 2}, {citySlug: "mumbai", indexedFormatPages: 0},
      {citySlug: "pune", indexedFormatPages: 1}],
    ...overrides,
  };
}

test("counts each cohort's organisers, claims, requests, corrections and pages", () => {
  const report = buildListingProgramReport(sources(), {now});
  assert.deepEqual(report.cohorts.map((cohort) => cohort.cohortId), ["indore-pilot-1", "mumbai-wave-1"]);
  const pilot = report.cohorts[0];
  assert.deepEqual([pilot.organizers, pilot.live, pilot.suspended, pilot.removed], [12, 10, 1, 0]);
  assert.deepEqual(pilot.claimsByStatus, {pending: 1, approved: 1, rejected: 0, withdrawn: 0, superseded: 0});
  assert.equal(pilot.takedownRequestsByType.correctFact, 1);
  assert.equal(pilot.takedownRequestsByType.legalOrder, 0, "the request for an organiser outside the cohort is not joined");
  assert.deepEqual(pilot.corrections, {requested: 1, staff: 2});
  assert.deepEqual([pilot.cities, pilot.indexedFormatPagesInCities], [1, 2]);
  assert.equal(report.total.organizers, 13);
  assert.equal(report.total.claimsByStatus.rejected, 1);
  assert.deepEqual(report.relisting, {activeSuppressions: 2, blockedAttempts: 4, suppressionsBlockedIn30d: 1});
  assert.deepEqual(report.indexedFormatPages, {total: 3, byCity: {indore: 2, mumbai: 0, pune: 1}});
  assert.equal(report.pauseRecommended, false);
  assert.doesNotMatch(renderListingProgramReport(report), /PAUSE RECOMMENDED/u);
});

test("any legal notice or impersonation claim recommends a pause", () => {
  for (const requestType of ["legalOrder", "trademark", "copyright", "impersonation"]) {
    const report = buildListingProgramReport(sources({takedownRequests: [
      {organizerId: "quiet-quarter-quiz", requestType, status: "received", createdAt: ago(200)}]}), {now});
    assert.equal(report.pauseRecommended, true, requestType);
    assert.equal(report.cohorts[0].pause.pause, false, "the other cohort is unaffected");
    assert.equal(report.cohorts[1].pause.pause, true);
    assert.match(renderListingProgramReport(report), /^PAUSE RECOMMENDED$/mu);
  }
});

test("two removals in 7 days trip the pilot rule; more than 3% over 30 days trips the share rule", () => {
  const removal = (organizerId, days) =>
    ({organizerId, requestType: "removeAndDoNotList", status: "received", createdAt: ago(days)});
  // One organiser asking twice is one removal.
  let report = buildListingProgramReport(sources({takedownRequests: [
    removal("lantern-lane-social-4", 2), removal("lantern-lane-social-4", 1)]}), {now});
  assert.equal(report.cohorts[0].removals7d, 1);
  // One of twelve is under the pilot's 7-day count but already over 3%.
  assert.deepEqual(report.cohorts[0].pause.triggers.map((trigger) => trigger.code), ["removal_share_30d"]);

  report = buildListingProgramReport(sources({takedownRequests: [
    removal("lantern-lane-social-4", 2), removal("lantern-lane-social-5", 6)]}), {now});
  const pilot = report.cohorts[0];
  assert.deepEqual(pilot.pause.triggers.map((trigger) => trigger.code), ["pilot_removals_7d", "removal_share_30d"]);
  // Off the pilot, only the 30-day share applies: 2 of 12 is 16.7%.
  const steady = buildListingProgramReport(sources({takedownRequests: [
    removal("lantern-lane-social-4", 2), removal("lantern-lane-social-5", 6)]}), {now, pilot: false});
  assert.deepEqual(steady.cohorts[0].pause.triggers.map((trigger) => trigger.code), ["removal_share_30d"]);

  // Removals older than 30 days, or in the future, do not count.
  report = buildListingProgramReport(sources({takedownRequests: [
    removal("lantern-lane-social-4", 31), removal("lantern-lane-social-5", -1)]}), {now});
  assert.deepEqual([report.cohorts[0].removals30d, report.pauseRecommended], [0, false]);
});

test("the 3% share needs more than 3%, not exactly 3%", () => {
  const base = {legalNotices: 0, impersonationClaims: 0, removals7d: 0};
  assert.equal(evaluatePause({...base, organizers: 100, removals30d: 3}).pause, false);
  assert.equal(evaluatePause({...base, organizers: 100, removals30d: 4}).pause, true);
  assert.equal(evaluatePause({...base, organizers: 0, removals30d: 0}).pause, false);
});

test("the printed report holds counts, cohort labels and city slugs, never organiser ids", () => {
  const text = renderListingProgramReport(buildListingProgramReport(sources({takedownRequests: [
    {organizerId: "lantern-lane-social-0", requestType: "impersonation", status: "received", createdAt: ago(1)}]}), {now}));
  assert.doesNotMatch(text, /lantern-lane-social|quiet-quarter-quiz/u);
  assert.match(text, /indore-pilot-1: 1 impersonation claim\(s\)/u);
  assert.match(text, /Re-listing attempts: 4 blocked across 2 active do-not-list cases/u);
});

test("millis reads Firestore timestamps, dates, ISO strings and numbers", () => {
  assert.equal(millis({toMillis: () => 5}), 5);
  assert.equal(millis(new Date(7)), 7);
  assert.equal(millis("1970-01-01T00:00:00.009Z"), 9);
  assert.equal(millis(11), 11);
  assert.equal(millis("not a date"), null);
  assert.equal(millis(undefined), null);
});

/** A read-only fake of the few Firestore calls the reader makes; it records every query. */
function fakeDb(collections) {
  const queries = [];
  const read = (path, filters, fields) => {
    queries.push({path, filters, fields});
    const rows = (collections[path] ?? []).filter((row) => filters.every(({field, op, value}) => {
      const actual = field.split(".").reduce((value_, part) => value_?.[part], row.data);
      if (op === ">") return typeof actual === "string" && actual > value;
      if (op === "in") return value.includes(actual);
      throw new Error(`unexpected ${op}`);
    }));
    return {size: rows.length, docs: rows.map((row) => ({id: row.id, data: () => row.data}))};
  };
  const query = (path, filters = [], fields = null) => ({
    where: (field, op, value) => query(path, [...filters, {field, op, value}], fields),
    select: (...selected) => query(path, filters, selected),
    limit: () => query(path, filters, fields),
    get: async () => read(path, filters, fields),
    set: () => {
      throw new Error("the report never writes");
    },
  });
  return {db: {collection: (path) => query(path)}, queries};
}

test("the reader masks fields, joins in chunks of 30 and skips organisers outside a cohort", async () => {
  const organizers = Array.from({length: 31}, (_, index) => ({id: `lantern-lane-social-${index}`,
    data: {name: "Lantern Lane Social", listingProgram: {cohortId: "indore-pilot-1", approvedAt: {toMillis: () => 1}},
      publicPage: {publishStatus: "published", citySlug: "indore"}}}));
  organizers.push({id: "quiet-quarter-quiz", data: {name: "Quiet Quarter Quiz", publicPage: {publishStatus: "published"}}});
  const {db, queries} = fakeDb({
    organizers,
    takedownRequests: [
      {id: "lr-1", data: {requestType: "impersonation", status: "received", createdAt: {toMillis: () => now},
        target: {kind: "organizer", id: "lantern-lane-social-30", path: null}}},
      {id: "lr-2", data: {requestType: "copyright", status: "received", createdAt: {toMillis: () => now},
        target: {kind: "url", id: null, path: "/indore/run-clubs/"}}},
    ],
    organizerClaimRequests: [{id: "c-1", data: {organizerId: "lantern-lane-social-0", status: "pending"}}],
    organizerIntakeFieldCorrections: [],
    listingSuppressions: [{id: "TD-0001", data: {active: true, blockedIntakeCount: 2, lastBlockedAtMillis: now}}],
    cityPlans: [{id: "indore", data: {citySlug: "indore", formatPages: {runClubs: {indexing: "index, follow"},
      studios: {indexing: "noindex, follow"}}}}],
  });
  const read = await readListingProgramSources(db);
  assert.equal(read.organizers.length, 31);
  assert.ok(read.organizers.every((row) => !("name" in row)));
  assert.deepEqual(read.takedownRequests, [{organizerId: "lantern-lane-social-30", requestType: "impersonation",
    status: "received", createdAt: now}]);
  assert.deepEqual(read.cityPlans, [{citySlug: "indore", indexedFormatPages: 1}]);
  const organizerQuery = queries.find((entry) => entry.path === "organizers");
  assert.ok(!organizerQuery.fields.includes("name"));
  const joins = queries.filter((entry) => entry.path === "takedownRequests");
  assert.deepEqual(joins.map((entry) => entry.filters[0].value.length), [30, 1]);
  assert.ok(queries.every((entry) => entry.fields !== null), "every read is field-masked");
});

test("main prints the report from an injected Firestore and needs a named project otherwise", async () => {
  const {db} = fakeDb({});
  let out = "";
  const report = await main(["--json"], {firestore: db, now, stdout: {write: (text) => {
    out += text;
  }}});
  assert.equal(JSON.parse(out).total.organizers, 0);
  assert.equal(report.pauseRecommended, false);
  await assert.rejects(main([], {now}), /--env/u);
});
