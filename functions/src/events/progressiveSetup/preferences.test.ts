import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import {updatePrivateEventPreferences} from "./preferences";
import {getPrivateEventSetup} from "./readModel";
import {createPrivateEventSetup, ProgressiveSetupDependencies} from "./service";
import {getManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import type {UpdatePrivateEventPreferencesCallablePayload} from
  "../../shared/generated/updatePrivateEventPreferencesCallablePayload";

type Row = Record<string, unknown>;

async function setup() {
  const rows = new Map<string, Row>();
  const readPaths: string[] = [];
  rows.set("organizers/org1", {hostUserId: "host1", hostUserIds: [],
    hostProfiles: [], ownerUserId: "host1", status: "active", archived: false,
    hostDefaults: {eventPolicy: {admissionPreset: "openCapacity"}}});
  rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
    revision: 1, eventSetup: {currency: "INR", offerValidityMinutes: 60,
      paymentInstructions: "Pay the organizer", timezone: "Asia/Kolkata"}});
  const db = {
    collection: (name: string) => ({doc: (id = "event1") =>
      ({path: `${name}/${id}`, id}),
    where: (_field: string, _op: string, eventId: string) => ({
      limit: (count: number) => {
        assert.equal(count, 1);
        return {path: name, queryEventId: eventId};
      },
    })}),
    runTransaction: async <T>(run: (tx: unknown) => Promise<T>) => {
      const writes: Array<() => void> = [];
      const result = await run({
        get: async (ref: {path: string; queryEventId?: string}) => {
          assert.equal(writes.length, 0, "All authority reads precede writes");
          readPaths.push(ref.path);
          return {exists: rows.has(ref.path), data: () => rows.get(ref.path),
            empty: ![...rows].some(([path, row]) =>
              path.startsWith(`${ref.path}/`) &&
              row.eventId === ref.queryEventId)};
        },
        create: (ref: {path: string}, value: Row) => writes.push(() => {
          assert.equal(rows.has(ref.path), false);
          rows.set(ref.path, value);
        }),
        set: (ref: {path: string}, value: Row) =>
          writes.push(() => rows.set(ref.path, value)),
        update: (ref: {path: string}, value: Row) => writes.push(() => {
          assert.ok(rows.has(ref.path));
          rows.set(ref.path, {...rows.get(ref.path), ...value});
        }),
      });
      writes.forEach((write) => write());
      return result;
    },
  } as unknown as FirebaseFirestore.Firestore;
  const deps: ProgressiveSetupDependencies = {db,
    serverTimestamp: () => Timestamp.fromMillis(10) as unknown as
      FirebaseFirestore.FieldValue,
    timestampFromMillis: Timestamp.fromMillis};
  await createPrivateEventSetup({actorUid: "host1", deps, command: {
    organizerId: "org1", requestId: "create-event1", basics: {
      name: "Mixer", city: {mode: "set", value: {
        cityId: "in-mh-mumbai", marketId: "in-mh-mumbai"}},
      localDate: "2026-10-18", localStartTime: "18:30",
      timezone: {mode: "set", value: "Asia/Kolkata"},
    },
  }});
  const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(db)});
  const command: UpdatePrivateEventPreferencesCallablePayload = {
    organizerId: "org1", eventId: "event1", requestId: "preferences-1",
    expectedSetupRevision: 1, expectedPreferencesRevision: 0,
    reviewedDefaultsHash: defaults.preferencesHash, intents: {
      usualDurationMinutes: {mode: "clear"},
      preferredVenueId: {mode: "clear"},
      offerValidityMinutes: {mode: "inherit"},
      admissionPreset: {mode: "inherit"},
      collectionPreference: {mode: "set", value: "manualInstructions"},
      currency: {mode: "inherit"},
      offerMessageTemplate: {mode: "clear"},
      paymentInstructions: {mode: "inherit"},
      reusablePaymentPage: {mode: "clear"},
      expectedAmountMinor: {mode: "set", value: 25000},
    },
  };
  return {rows, db, deps, command, readPaths,
    save: (overrides = {}) => updatePrivateEventPreferences({actorUid: "host1",
      command: {...command, ...overrides}, deps})};
}

const isCode = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

test("event preference save snapshots defaults privately without admission",
  async () => {
    const h = await setup();
    const publicOrganizer = h.rows.get("organizers/org1");
    const historicalOffer = {paymentAmountMinor: 15000, revision: 1};
    h.rows.set("organizerEventOffers/old-offer", historicalOffer);
    assert.deepEqual(await h.save(), {eventId: "event1", setupRevision: 2,
      replayed: false});
    const stored = h.rows.get("eventSetupPreferences/event1");
    assert.ok(stored);
    const terms = stored.paymentTerms as Row;
    assert.equal(terms.expectedAmountMinor, 25000);
    assert.equal(terms.paymentInstructions, "Pay the organizer");
    assert.equal(terms.sourceDefaultsRevision, 1);
    assert.deepEqual(h.rows.get("organizers/org1"), publicOrganizer);
    assert.deepEqual(h.rows.get("organizerEventOffers/old-offer"),
      historicalOffer);
    assert.equal(h.rows.get("events/event1")?.bookedCount, 0);
    assert.equal(h.rows.get("events/event1")?.priceInPaise, undefined);
    assert.equal(h.rows.get("events/event1")?.paymentInstructions, undefined);
    h.rows.set("eventSetupPreferences/event1", {...stored, secret: "never"});
    const read = await getPrivateEventSetup({actorUid: "host1", db: h.db,
      command: {organizerId: "org1", eventId: "event1"}});
    assert.equal(read.eventPreferences?.revision, 1);
    assert.equal(Object.hasOwn(read.eventPreferences!, "secret"), false);
    for (const path of ["organizers/org1", "deletedUsers/host1",
      "events/event1", "organizerEventSetupDefaults/org1",
      "eventSetupPreferences/event1"]) assert.ok(h.readPaths.includes(path));
  });

test("exact retry retains original revision after a subsequent edit",
  async () => {
    const h = await setup();
    const first = await h.save();
    await h.save({requestId: "preferences-2", expectedSetupRevision: 2,
      expectedPreferencesRevision: 1, intents: {...h.command.intents,
        paymentInstructions: {mode: "clear"}}});
    assert.deepEqual(await h.save(), {...first, replayed: true});
    assert.equal(h.rows.get("events/event1")?.setupRevision, 3);
    const terms = h.rows.get("eventSetupPreferences/event1")
      ?.paymentTerms as Row;
    assert.equal(terms.paymentInstructions, null);
    await assert.rejects(h.save({intents: {...h.command.intents,
      expectedAmountMinor: {mode: "set", value: 1}}}),
    isCode("already-exists"));
  });

test("defaults and independent event revisions both fence stale edits",
  async () => {
    const h = await setup();
    const before = h.rows.get("events/event1");
    h.rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
      revision: 2, eventSetup: {currency: "USD"}});
    await assert.rejects(h.save(), isCode("aborted"));
    assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
    assert.deepEqual(h.rows.get("events/event1"), before);
    const j = await setup();
    await j.save();
    await assert.rejects(j.save({requestId: "stale-pref-1",
      expectedSetupRevision: 2}), isCode("aborted"));
    await assert.rejects(j.save({requestId: "stale-setup-1",
      expectedPreferencesRevision: 1}), isCode("aborted"));
  });

test("replay rechecks manager and deleted-account authority", async () => {
  for (const deleted of [false, true]) {
    const h = await setup();
    await h.save();
    if (deleted) h.rows.set("deletedUsers/host1", {});
    else {
      h.rows.set("organizers/org1", {...h.rows.get("organizers/org1"),
        hostUserId: "other", ownerUserId: "other"});
    }
    await assert.rejects(h.save(),
      isCode(deleted ? "failed-precondition" : "permission-denied"));
  }
});

test("private preferences reject wrong event authority and exhausted revisions",
  async () => {
    for (const patch of [{organizerId: "foreign"}, {organizerId: "foreign"},
      {publicationState: "published"}, {status: "cancelled"},
      {setupRevision: 1_000_000_000}]) {
      const h = await setup();
      h.rows.set("events/event1", {...h.rows.get("events/event1"), ...patch});
      await assert.rejects(h.save(), isCode("organizerId" in patch ? "not-found" : "failed-precondition"));
      assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
    }
  });

test("client authority, inherited amounts and bypasses reject", async () => {
  const h = await setup();
  await assert.rejects(h.save({intents: {...h.command.intents,
    expectedAmountMinor: {mode: "inherit"}}}), isCode("invalid-argument"));
  await assert.rejects(h.save({providerActivated: true}),
    isCode("invalid-argument"));
  assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
});


test("malformed saved snapshots cannot authorize changes", async () => {
  const h = await setup();
  await h.save();
  const path = "eventSetupPreferences/event1";
  const saved = h.rows.get(path)!;
  h.rows.set(path, {...saved, paymentTerms: {...saved.paymentTerms as Row,
    expectedAmountMinor: 1}});
  await assert.rejects(h.save({requestId: "preferences-2",
    expectedSetupRevision: 2, expectedPreferencesRevision: 1}),
  isCode("failed-precondition"));
  await assert.rejects(getPrivateEventSetup({actorUid: "host1", db: h.db,
    command: {organizerId: "org1", eventId: "event1"}}),
  isCode("failed-precondition"));
});


test("settings requests cannot move to a different authenticated account",
  async () => {
    const h = await setup();
    await assert.rejects(h.save({expectedActorUid: "host2"}),
      isCode("permission-denied"));
    assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
  });

test("stale rejection identifies only the exact uncommitted settings request",
  async () => {
    const h = await setup();
    h.rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
      revision: 2, eventSetup: {currency: "USD"}});
    await assert.rejects(h.save(), (error: unknown) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "aborted");
      assert.deepEqual(error.details, {reason: "event-preferences-review-stale",
        requestId: h.command.requestId, eventId: h.command.eventId,
        organizerId: h.command.organizerId});
      return true;
    });
    assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
  });
