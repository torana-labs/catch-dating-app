import test from "node:test";
import assert from "node:assert/strict";
import {classifyOrganizerProfile, readOrganizerProfileClassification,
  organizerProfileClassificationReadLimit} from
  "./organizerProfileClassification";
import {organizerTrackingPublicationPolicy as policy} from
  "./organizerTrackingPublicationPolicy";

const run = (activityKind = "running", interactionModel = "pacePods") => ({
  publicationState: "published", status: "active",
  eventFormat: {version: 1, activityKind, interactionModel}});
const listing = {publicationStatus: "public", status: "active"};
const classify = (native: Record<string, unknown>[],
  external: Record<string, unknown>[] = [], truncated = false) =>
  classifyOrganizerProfile({native, external, truncated});

test("eligible only with classified, non-excluded published native events",
  () => {
    assert.equal(classify([run(), run("yoga", "classSession")]), "eligible");
  });

test("no published active native event is unknown (fail closed)", () => {
  assert.equal(classify([]), "unknown");
  assert.equal(classify([{...run(), status: "cancelled"}]), "unknown");
  assert.equal(classify([{...run(), publicationState: "draft"}]), "unknown");
});

test("an unclassified event makes the profile unknown", () => {
  assert.equal(classify([run(), {publicationState: "published",
    status: "active"}]), "unknown");
  assert.equal(classify([run(), {...run(), eventFormat: {version: 2,
    activityKind: "running", interactionModel: "pacePods"}}]), "unknown");
});

test("excluded classes come from the policy version", () => {
  for (const kind of policy.excludedActivityKinds) {
    assert.equal(classify([run(), run(kind)]), "sensitive");
  }
  for (const model of policy.excludedInteractionModels) {
    assert.equal(classify([run("running", model)]), "sensitive");
  }
  const lifted = {...policy, excludedActivityKinds: [],
    excludedInteractionModels: []};
  assert.equal(classifyOrganizerProfile({native: [run("singlesMixer",
    "freeFormMixer")], external: [], truncated: false}, lifted), "eligible");
});

const future = Date.UTC(2026, 11, 1);
const now = Date.UTC(2026, 10, 19);
const scraped = (activityKind: string, title = "Sunday session",
  startTime: unknown = {toMillis: () => future}) => ({...listing, title,
  description: "Open to all.", startTime,
  activity: {version: 1, activityKind, interactionModel: "openFormat",
    source: "heuristic"}});
const classifyAt = (native: Record<string, unknown>[],
  external: Record<string, unknown>[]) => classifyOrganizerProfile(
  {native, external, truncated: false}, policy, now);

test("scraped organiser: every upcoming listing allowed makes it eligible",
  () => {
    assert.equal(policy.externalListingsCountAsUnknown, false);
    for (const kind of policy.externalListingAllowance.activityKinds) {
      assert.equal(classifyAt([], [scraped(kind)]), "eligible");
    }
    assert.equal(classifyAt([], [scraped("yoga"), scraped("padel")]),
      "eligible");
    assert.equal(classifyAt([run()], [scraped("pubQuiz")]), "eligible");
  });

test("scraped organiser: an ambiguous or excluded label stays unknown", () => {
  for (const kind of ["openActivity", "socialRun", "dinner", "barCrawl"]) {
    assert.equal(classifyAt([], [scraped("yoga"), scraped(kind)]), "unknown");
  }
  assert.equal(classifyAt([], [{...scraped("yoga"), activity: undefined}]),
    "unknown");
  assert.equal(classifyAt([run()], [scraped("openActivity")]), "unknown");
});

test("scraped organiser: dating words make it sensitive", () => {
  for (const title of ["Singles yoga", "Padel mixer night", "Quiz for singles",
    "Speed dating on bikes", "Matchmaking brunch ride", "Date night tennis"]) {
    assert.equal(classifyAt([], [scraped("yoga", title)]), "sensitive");
  }
  assert.equal(classifyAt([], [scraped("yoga", "Single-origin coffee ride")]),
    "sensitive");
  assert.equal(classifyAt([], [scraped("pubQuiz", "Mixed doubles quiz")]),
    "eligible");
});

test("scraped organiser: no captured upcoming listing stays unknown", () => {
  assert.equal(classifyAt([], []), "unknown");
  assert.equal(classifyAt([], [scraped("yoga", "Past class",
    {toMillis: () => now - 1})]), "unknown");
  assert.equal(classifyAt([], [scraped("yoga", "Undated", null)]),
    "unknown");
  assert.equal(classifyAt([], [{...scraped("yoga"), status: "cancelled"}]),
    "unknown");
  // Past listings do not count against an organiser with native events.
  assert.equal(classifyAt([run()], [scraped("openActivity", "Old",
    {toMillis: () => now - 1})]), "eligible");
});

test("the all-unknown switch still overrides the allowance", () => {
  const strict = {...policy, externalListingsCountAsUnknown: true};
  assert.equal(classifyOrganizerProfile({native: [run()],
    external: [scraped("yoga")], truncated: false}, strict, now), "unknown");
});

test("blocked words are plain lowercase words", () => {
  for (const word of policy.externalListingAllowance.blockedWords) {
    assert.match(word, /^[a-z]+(?: [a-z]+)*$/u);
  }
});

test("a truncated read fails closed", () => {
  assert.equal(classify([run()], [], true), "unknown");
});

test("reads both collections by owner, one past the limit", async () => {
  const calls: string[] = [];
  const db = {collection: (name: string) => ({where: (field: string,
    _op: string, value: string) => ({limit: (count: number) => ({
    get: async () => {
      calls.push(`${name}.${field}=${value}:${count}`);
      const size = name === "events" ? count : 0;
      return {size, docs: Array.from({length: size}, () => ({
        data: () => run()}))};
    }})})})} as unknown as FirebaseFirestore.Firestore;
  assert.equal(await readOrganizerProfileClassification(db, "org-1"),
    "unknown");
  const limit = organizerProfileClassificationReadLimit + 1;
  assert.deepEqual(calls.sort(), [`events.organizerId=org-1:${limit}`,
    `externalEvents.canonicalHostId=org-1:${limit}`]);
});
