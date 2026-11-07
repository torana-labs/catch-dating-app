import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {normalizePrivateEventBasics} from
  "../events/progressiveSetup/basics";
import {
  backfillEventSetupViews,
  reconcileEventSetupView,
} from "./eventSetupViewStore";

type Data = Record<string, unknown>;

const validateView = contractValidator("HostEventSetupViewDocument");
const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const clock = (millis = nowMillis) =>
  ({now: () => Timestamp.fromMillis(millis)});

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

/** The valid organizer fixture, limited to the fields the contract owns. */
function setupViewOrganizer(patch: Data = {}): Data {
  const schema = json("../contracts/firestore/organizers.schema.json");
  return {...Object.fromEntries(Object.entries(
    json("../contracts/fixtures/valid/organizer_doc.json"))
    .filter(([key]) => key in schema.properties)), organizerPhotos: [],
  followerCount: 12, organizerType: "community", appVisibility: "discoverable",
  ...patch};
}

/** A basics-only private event, as createPrivateEventSetup writes it. */
function setupViewPrivateEvent(patch: Data = {}): Data {
  const basics = normalizePrivateEventBasics({
    basics: {
      name: "Sunday Mixer",
      city: {mode: "set", value: {
        cityId: "in-mh-mumbai", marketId: "in-mh-mumbai",
      }},
      localDate: "2026-10-18",
      localStartTime: "18:30",
      timezone: {mode: "set", value: "Asia/Kolkata"},
    },
    defaults: {revision: 1},
  });
  return {
    organizerId: "org",
    name: basics.name,
    eventCityId: basics.eventCityId,
    eventMarketId: basics.eventMarketId,
    eventLocalDate: basics.eventLocalDate,
    eventLocalStartTime: basics.eventLocalStartTime,
    eventTimezone: basics.eventTimezone,
    startTime: Timestamp.fromMillis(basics.startTimeMillis),
    setupDefaults: basics.setupDefaults,
    setupRevision: 1,
    publicationState: "private",
    publicRegistrationEnabled: false,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    ...patch,
  };
}

function store(docs: Record<string, Data> = {}): AudienceTestStore {
  return new AudienceTestStore({
    "organizers/org": setupViewOrganizer(),
    "events/event-1": setupViewPrivateEvent(),
    ...docs,
  });
}

const view = (db: AudienceTestStore, id = "event-1") =>
  db.docs[`hostEventSetupViews/${id}`] as Data | undefined;
const summary = (db: AudienceTestStore, id = "event-1") =>
  view(db, id)?.summary as Data;

test("a basics-only private event gets a complete, valid view",
  async () => {
    const db = store();
    const outcome = await reconcileEventSetupView(db.asFirestore(), "event-1",
      clock());
    assert.deepEqual(outcome, {kind: "complete", revision: 1});
    const written = view(db)!;
    assert.ok(validateView(written), JSON.stringify(validateView.errors));
    assert.equal(written.organizerId, "org");
    assert.equal(written.setupRevision, 1);
    assert.equal(written.sourceCoverage, "complete");
    assert.equal(written.incompleteSource, null);
    const projected = summary(db);
    assert.equal(projected.name, "Sunday Mixer");
    assert.equal(projected.canEditBasics, true);
    assert.equal(projected.canChangeCity, true);
    assert.equal(projected.detailsConfigured, false);
    assert.equal(projected.eventPreferences, null);
    assert.deepEqual(projected.eventDetails, {endTimeMillis: null,
      venueName: null, description: null, admissionTerms: null,
      distanceKm: null, pace: null, itinerary: [], eventPhotos: [],
      sourceVenueId: null, eventFormat: null, meetingLocation: null});
    assert.equal(projected.startTimeMillis, Date.UTC(2026, 9, 18, 13));
  });

test("readiness checks every requirement except time, which is the phone's",
  async () => {
    // Already started: the callable would have listed futureActive.
    const db = store({"events/event-1": setupViewPrivateEvent({
      startTime: Timestamp.fromMillis(nowMillis - 60_000)})});
    await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
    const readiness = summary(db).publicationReadiness as Data;
    assert.equal(readiness.canPublishWhenFuture, false);
    assert.equal((readiness.missing as string[]).includes("futureActive"),
      false);
    assert.ok((readiness.missing as string[]).includes("venue"));
  });

test("a re-evaluation with nothing changed writes nothing", async () => {
  const db = store();
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  const first = view(db);
  const outcome = await reconcileEventSetupView(db.asFirestore(), "event-1",
    clock(nowMillis + 60_000));
  assert.deepEqual(outcome, {kind: "unchanged", revision: 1});
  assert.deepEqual(view(db), first);
});

test("a commitment witness locks basics until it is gone", async () => {
  const db = store();
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  assert.equal(summary(db).canEditBasics, true);
  db.docs["organizerEventOffers/offer"] = {eventId: "event-1",
    status: "withdrawn"};
  assert.deepEqual(await reconcileEventSetupView(db.asFirestore(), "event-1",
    clock()), {kind: "complete", revision: 2});
  assert.equal(summary(db).canEditBasics, false);
  assert.equal(summary(db).canChangeCity, false);
  delete db.docs["organizerEventOffers/offer"];
  db.docs["payments/other"] = {eventId: "other-event"};
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  assert.equal(summary(db).canEditBasics, true);
});

test("a venue keeps basics editable but fixes the city", async () => {
  const db = store({"events/event-1": setupViewPrivateEvent({
    meetingPoint: "Clubhouse"})});
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  assert.equal(summary(db).canEditBasics, true);
  assert.equal(summary(db).canChangeCity, false);
  assert.equal(summary(db).detailsConfigured, true);
});

test("rich fields and secrets never reach the view", async () => {
  const db = store({"events/event-1": setupViewPrivateEvent({
    privatePaymentSecret: "never"})});
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  assert.equal(JSON.stringify(view(db)).includes("never"), false);
});

for (const [label, patch] of [
  ["a missing timezone", {eventTimezone: null}],
  ["a malformed end time", {endTime: {}}],
  ["an unknown publication state", {publicationState: "draft"}],
  ["a published event that fails its contract", {publicationState:
    "published"}],
  ["a zero setup revision", {setupRevision: 0}],
] as const) {
  test(`${label} is recorded as an invalid event, keeping the last summary`,
    async () => {
      const db = store();
      await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
      const previous = summary(db);
      db.docs["events/event-1"] = setupViewPrivateEvent(patch);
      const outcome = await reconcileEventSetupView(db.asFirestore(),
        "event-1", clock());
      assert.equal(outcome.kind, "invalidSource");
      assert.equal(outcome.kind === "invalidSource" &&
        outcome.source, "events");
      const written = view(db)!;
      assert.ok(validateView(written), JSON.stringify(validateView.errors));
      assert.equal(written.sourceCoverage, "invalidSource");
      assert.equal(written.incompleteSource, "events");
      assert.deepEqual(written.summary, previous);
      assert.equal(written.revision, 2);
      // The same invalid source again changes nothing.
      assert.equal((await reconcileEventSetupView(db.asFirestore(),
        "event-1", clock())).kind, "invalidSource");
      assert.equal(view(db)!.revision, 2);
    });
}

test("invalid preferences and organizers name their source", async () => {
  const db = store({"eventSetupPreferences/event-1": {organizerId: "org",
    eventId: "event-1", revision: 1, preferences: {}, paymentTerms: {}}});
  const outcome = await reconcileEventSetupView(db.asFirestore(), "event-1",
    clock());
  assert.equal(outcome.kind === "invalidSource" && outcome.source,
    "eventSetupPreferences");
  assert.equal(view(db)!.summary, null);
  assert.ok(validateView(view(db)), JSON.stringify(validateView.errors));
  delete db.docs["eventSetupPreferences/event-1"];
  db.docs["organizers/org"] = {hostUserId: "host-1"};
  const organizerOutcome = await reconcileEventSetupView(db.asFirestore(),
    "event-1", clock());
  assert.equal(organizerOutcome.kind === "invalidSource" &&
    organizerOutcome.source, "organizers");
  delete db.docs["organizers/org"];
  assert.equal((await reconcileEventSetupView(db.asFirestore(), "event-1",
    clock())).kind, "invalidSource");
});

test("an event that is gone or never had setup has no view", async () => {
  const db = store();
  await reconcileEventSetupView(db.asFirestore(), "event-1", clock());
  delete db.docs["events/event-1"];
  assert.deepEqual(await reconcileEventSetupView(db.asFirestore(), "event-1",
    clock()), {kind: "removed", existed: true});
  assert.equal(view(db), undefined);
  db.docs["events/legacy"] = {organizerId: "org", status: "active"};
  assert.deepEqual(await reconcileEventSetupView(db.asFirestore(), "legacy",
    clock()), {kind: "removed", existed: false});
  assert.equal(view(db, "legacy"), undefined);
});

test("a published event reports no publish action and no basics edits",
  async () => {
    const basics = setupViewPrivateEvent();
    const start = (basics.startTime as Timestamp).toMillis();
    const event = {...json("../contracts/fixtures/valid/event_doc.json"),
      ...basics, publicationState: "published",
      endTime: Timestamp.fromMillis(start + 60 * 60_000)};
    const db = store({"events/event-1": event});
    const outcome = await reconcileEventSetupView(db.asFirestore(), "event-1",
      clock());
    assert.equal(outcome.kind, "complete", JSON.stringify(outcome));
    assert.ok(validateView(view(db)), JSON.stringify(validateView.errors));
    assert.equal(summary(db).publicationState, "published");
    assert.equal(summary(db).canEditBasics, false);
    assert.deepEqual(summary(db).publicationReadiness,
      {canPublishWhenFuture: false, missing: []});
  });

test("backfill counts the organizer's setup events and evaluates on apply",
  async () => {
    const db = store({
      "events/event-2": setupViewPrivateEvent(),
      "events/legacy": {organizerId: "org", status: "active"},
      "events/foreign": setupViewPrivateEvent({organizerId: "other"}),
    });
    const counted = await backfillEventSetupViews(db.asFirestore(), "org",
      false);
    assert.deepEqual(counted, {events: 2, outcomes: {removed: 0,
      unchanged: 0, complete: 0, invalidSource: 0}});
    assert.equal(view(db), undefined);
    const applied = await backfillEventSetupViews(db.asFirestore(), "org",
      true);
    assert.equal(applied.outcomes.complete, 2);
    assert.ok(view(db, "event-2"));
    assert.equal(view(db, "foreign"), undefined);
  });
