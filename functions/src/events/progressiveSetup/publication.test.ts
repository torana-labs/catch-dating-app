import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {Store} from "../../organizerFormAdmission/admissionTestFixture";
import {getPrivateEventSetup} from "./readModel";
import {createPrivateEventSetup} from "./service";
import {updatePrivateEventDetails} from "./details";
import {getManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {setEventPublication} from "./publication";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventSetupReceiptDocument} from
  "../../shared/generated/validators/eventSetupReceiptDocument";

function setup() {
  const store = new Store();
  const raw = JSON.parse(readFileSync(resolve(__dirname,
    "../../../../contracts/fixtures/valid/event_doc.json"), "utf8"));
  const start = 1_900_000_000_000;
  const event = {...raw, organizerId: "org1", startTime: Timestamp.fromMillis(start),
    endTime: Timestamp.fromMillis(start + 60 * 60_000),
    eventCityId: "in-mp-indore", eventMarketId: "in-mp-indore",
    eventLocalDate: "2030-03-17", eventLocalStartTime: "12:00",
    eventTimezone: "Asia/Kolkata", setupRevision: 1,
    publicationState: "private", publicRegistrationEnabled: false,
    setupDefaults: {city: {value: {cityId: "in-mp-indore",
      marketId: "in-mp-indore"}, source: "event"},
    timezone: {value: "Asia/Kolkata", source: "event"},
    organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)}};
  store.put("events/event1", event);
  store.put("organizers/org1", {ownerUserId: "host1", hostUserId: "host1",
    hostUserIds: [], hostProfiles: [], status: "active", archived: false,
    appVisibility: "discoverable"});
  const command = {organizerId: "org1", eventId: "event1",
    requestId: "publish-one", expectedSetupRevision: 1,
    publicationState: "published" as const};
  const deps = {db: store.db(),
    timestampFromMillis: Timestamp.fromMillis,
    serverTimestamp: () => Timestamp.fromMillis(1) as unknown as
      FirebaseFirestore.FieldValue};
  const run = (next: Parameters<typeof setEventPublication>[0]["command"] =
  command, actorUid = "host1") => setEventPublication({actorUid,
    command: next, deps, nowMillis: () => start - 60_000});
  return {store, event, command, deps, run};
}
const errorCode = (expected: string) => (e: unknown) =>
  e instanceof HttpsError && e.code === expected;

test("publish preserves guests, claims schedule and keeps registration closed",
  async () => {
    const h = setup();
    h.store.put("eventAttendees/guest1", {eventId: "event1",
      status: "confirmed"});
    const before = h.event.bookedCount;
    const result = await h.run();
    assert.deepEqual(result, {eventId: "event1", setupRevision: 2,
      publicationState: "published", replayed: false});
    const event = h.store.get("events/event1")!;
    assert.equal(validateEventDocument(event), true,
      JSON.stringify(validateEventDocument.errors));
    assert.equal(event.bookedCount, before);
    assert.equal(event.publicRegistrationEnabled, false);
    assert.equal(event.publicRegistrationMode, "closed");
    assert.equal(event.publicRegistrationRevision, 1);
    assert.ok(event.firstPublishedAt);
    assert.equal(h.store.get("eventAttendees/guest1")!.status, "confirmed");
    assert.ok(h.store.writes.some((p) =>
      p.startsWith("organizerScheduleLocks/")));
    const receipts = [...h.store.rows].filter(([p]) =>
      p.startsWith("eventSetupReceipts/"));
    assert.equal(receipts.length, 1);
    assert.equal(validateEventSetupReceiptDocument(receipts[0][1]), true);
  });

test("republish keeps registration closed and retains payment history",
  async () => {
    const h = setup();
    await h.run();
    Object.assign(h.store.get("events/event1")!, {
      publicRegistrationEnabled: true, publicRegistrationMode: "paid",
      publicRegistrationRevision: 2});
    const stamp = h.store.get("events/event1")!.firstPublishedAt;
    h.store.put("publicEventPayments/payment1", {eventId: "event1",
      status: "admitted"});
    const locks = h.store.writes.filter((p) =>
      p.startsWith("organizerScheduleLocks/"));
    await h.run({...h.command, requestId: "unpublish-one",
      expectedSetupRevision: 2, publicationState: "private"});
    assert.equal(h.store.get("events/event1")!.publicRegistrationRevision, 3);
    assert.equal(h.store.get("events/event1")!.publicRegistrationEnabled,
      false);
    assert.ok(locks.every((path) => h.store.get(path)));
    await h.run({...h.command, requestId: "publish-two",
      expectedSetupRevision: 3});
    assert.equal(h.store.get("events/event1")!.publicRegistrationMode,
      "closed");
    assert.equal(h.store.get("events/event1")!.firstPublishedAt, stamp);
    assert.equal(h.store.get("publicEventPayments/payment1")!.status,
      "admitted");
  });

test("retry after unpublish reports original receipt without changing state",
  async () => {
    const h = setup();
    h.store.failNextCommit = true;
    await assert.rejects(h.run(), /Interrupted commit/);
    assert.equal(h.store.writes.length, 0);
    await h.run();
    await h.run({...h.command, requestId: "unpublish-one",
      expectedSetupRevision: 2, publicationState: "private"});
    const count = h.store.writes.length;
    assert.equal((await h.run()).replayed, true);
    assert.equal(h.store.writes.length, count);
    assert.equal(h.store.get("events/event1")!.publicationState, "private");
    await assert.rejects(h.run({...h.command, publicationState: "private"}),
      errorCode("already-exists"));
  });

test("current manager and deleted-account authority are rechecked on replay",
  async () => {
    const h = setup();
    await assert.rejects(h.run(h.command, "stranger"),
      errorCode("permission-denied"));
    await h.run();
    h.store.put("deletedUsers/host1", {});
    await assert.rejects(h.run(), errorCode("failed-precondition"));
  });

test("publication rejects stale, incomplete, past and hidden events",
  async () => {
    const h = setup();
    await assert.rejects(h.run({...h.command, expectedSetupRevision: 2}),
      errorCode("aborted"));
    for (const field of ["endTime", "meetingLocation", "capacityLimit",
      "priceInPaise", "eventFormat"]) {
      const value = h.event[field];
      delete h.event[field];
      await assert.rejects(h.run(), errorCode("failed-precondition"));
      h.event[field] = value;
    }
    h.event.startTime = Timestamp.fromMillis(1);
    await assert.rejects(h.run(), errorCode("failed-precondition"));
    h.event.startTime = Timestamp.fromMillis(1_900_000_000_000);
    h.store.get("organizers/org1")!.appVisibility = "hidden";
    await assert.rejects(h.run(), errorCode("failed-precondition"));
    assert.equal(h.store.writes.length, 0);
  });

test("conflicting schedule rolls back publication and receipt together",
  async () => {
    const h = setup();
    h.store.put("events/other", {...h.event});
    await assert.rejects(h.run(), errorCode("failed-precondition"));
    assert.equal(h.store.writes.length, 0);
    assert.equal(h.event.publicationState, "private");
  });

test("unpublish remains possible after cancellation without reopening bookings",
  async () => {
    const h = setup();
    await h.run();
    h.store.get("events/event1")!.status = "cancelled";
    await h.run({...h.command, requestId: "unpublish-one",
      expectedSetupRevision: 2, publicationState: "private"});
    assert.equal(h.store.get("events/event1")!.status, "cancelled");
    await assert.rejects(h.run({...h.command, requestId: "publish-two",
      expectedSetupRevision: 3}), errorCode("failed-precondition"));
  });


test("fresh progressive event publishes after details", async () => {
  const h = setup();
  h.store.rows.delete("events/event1");
  const db = {
    collection: (name: string) => {
      const source = h.store.collection(name);
      return {...source, doc: (id = "fresh-event") =>
        ({...source.doc(id), id})};
    },
    runTransaction: h.store.runTransaction.bind(h.store),
  } as unknown as FirebaseFirestore.Firestore;
  const deps = {...h.deps, db};
  const created = await createPrivateEventSetup({actorUid: "host1", deps,
    command: {organizerId: "org1", requestId: "create-fresh",
      basics: {name: "Sunday dinner", city: {mode: "set", value: {
        cityId: "in-mp-indore", marketId: "in-mp-indore"}},
      localDate: "2030-03-17", localStartTime: "19:00",
      timezone: {mode: "set", value: "Asia/Kolkata"}}}});
  const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(db)});
  const saved = await updatePrivateEventDetails({actorUid: "host1", deps,
    command: {organizerId: "org1", eventId: created.eventId,
      requestId: "details-fresh", expectedSetupRevision: 1,
      reviewedDefaultsHash: defaults.preferencesHash, details: {
        durationMinutes: {mode: "set", value: 90},
        venue: {mode: "set", value: {name: "Town Hall",
          latitude: 22.7, longitude: 75.8}},
        description: "A shared dinner with new friends.",
        eventFormat: {mode: "set", value: {version: 1, activityKind: "dinner",
          interactionModel: "seatedTable"}},
        admissionTerms: {capacityLimit: 12, priceInPaise: 50000,
          currency: "INR", cancellationPolicyId: "standard"}}}});
  const publish = await setEventPublication({actorUid: "host1", deps,
    nowMillis: () => Date.parse("2030-03-01T00:00:00Z"),
    command: {...h.command, eventId: created.eventId,
      expectedSetupRevision: saved.setupRevision}});
  assert.equal(publish.publicationState, "published");
  const event = h.store.get(`events/${created.eventId}`)!;
  assert.equal(validateEventDocument(event), true,
    JSON.stringify(validateEventDocument.errors));
  assert.equal(event.publicRegistrationEnabled, false);
  assert.equal(event.distanceKm, 0);
  assert.equal(event.pace, "easy");
  const reopened = await getPrivateEventSetup({actorUid: "host1", db,
    command: {organizerId: "org1", eventId: created.eventId}});
  assert.equal(reopened.publicationState, "published");
  assert.equal(reopened.canEditBasics, false);
  assert.equal(reopened.publicationReadiness?.canPublish, false);
  assert.equal(h.store.get(`eventSeatLedgers/${created.eventId}`)!.state,
    "ready");
});


test("stale marker identifies an uncommitted command", async () => {
  const h = setup();
  const stale = {...h.command, expectedSetupRevision: 2};
  await assert.rejects(h.run(stale), (error) => {
    assert.ok(error instanceof HttpsError);
    assert.deepEqual(error.details, {reason: "event-publication-review-stale",
      requestId: stale.requestId, organizerId: stale.organizerId,
      eventId: stale.eventId, expectedSetupRevision: 2,
      publicationState: "published"});
    return true;
  });
  await h.run();
  assert.equal((await h.run()).replayed, true);
});
