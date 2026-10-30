import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {getManagerEventSetupDefaults} from
  "../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../organizers/eventSetupDefaults/dependencies";
import {configureEventOfferPreferences,
  ConfigureEventOfferPreferencesCommand} from
  "./eventOfferConfigurationService";

type Row = Record<string, unknown>;
const NOW = Date.parse("2026-10-20T18:00:00Z");

function richEvent(): Row {
  const source = JSON.parse(readFileSync(
    join(__dirname, "../../../contracts/fixtures/valid/event_doc.json"),
    "utf8")) as Row;
  return {...source, organizerId: "org1",
    publicationState: "published",
    startTime: Timestamp.fromMillis(NOW),
    endTime: Timestamp.fromMillis(NOW + 3_600_000)};
}

function privateEvent(): Row {
  return {organizerId: "org1", name: "Event",
    startTime: Timestamp.fromMillis(NOW), status: "active",
    publicationState: "private", setupRevision: 3,
    publicRegistrationEnabled: false, eventCityId: "city1",
    eventMarketId: "market1", eventLocalDate: "2026-10-21",
    eventLocalStartTime: "18:00", eventTimezone: "Asia/Kolkata",
    setupDefaults: {city: {value: {cityId: "city1", marketId: "market1"},
      source: "event"}, timezone: {value: "Asia/Kolkata", source: "event"},
    organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)},
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    cancelledAt: null, cancellationReason: null, genderCounts: {},
    cohortCounts: {}, waitlistedCohortCounts: {}};
}

async function setup(event = richEvent()) {
  const rows = new Map<string, Row>();
  const updateTimes = new Map<string, Timestamp>();
  const legacyUpdateTime = new Timestamp(1_800_000_000, 123_456_000);
  updateTimes.set("events/event1", legacyUpdateTime);
  const readPaths: string[] = [];
  const writePaths: string[] = [];
  rows.set("organizers/org1", {hostUserId: "host1", ownerUserId: "host1",
    hostUserIds: [], hostProfiles: [], status: "active", archived: false,
    hostDefaults: {eventPolicy: {admissionPreset: "openCapacity"}}});
  rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
    revision: 1, eventSetup: {currency: "INR", offerValidityMinutes: 60,
      paymentInstructions: "Pay the organizer", timezone: "Asia/Kolkata"}});
  rows.set("events/event1", event);
  const db = {
    collection: (name: string) => ({doc: (id: string) =>
      ({path: `${name}/${id}`})}),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const pending: Array<() => void> = [];
      const result = await fn({
        get: async (ref: {path: string}) => {
          assert.equal(pending.length, 0, "all reads precede writes");
          readPaths.push(ref.path);
          return {exists: rows.has(ref.path), data: () => rows.get(ref.path),
            updateTime: updateTimes.get(ref.path)};
        },
        set: (ref: {path: string}, value: Row) => {
          writePaths.push(ref.path);
          pending.push(() => rows.set(ref.path, value));
        },
        create: (ref: {path: string}, value: Row) => {
          writePaths.push(ref.path);
          pending.push(() => {
            assert.equal(rows.has(ref.path), false);
            rows.set(ref.path, value);
          });
        },
      });
      pending.forEach((write) => write());
      return result;
    },
  } as unknown as FirebaseFirestore.Firestore;
  const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(db)});
  const command: ConfigureEventOfferPreferencesCommand = {
    organizerId: "org1", eventId: "event1", requestId: "offer-settings-1",
    expectedPreferencesRevision: 0,
    expectedEventSourceRevision: event.setupRevision as number ??
      1_800_000_000_123_456,
    reviewedDefaultsHash: defaults.preferencesHash,
    intents: {usualDurationMinutes: {mode: "clear"},
      preferredVenueId: {mode: "clear"},
      offerValidityMinutes: {mode: "inherit"},
      admissionPreset: {mode: "inherit"},
      collectionPreference: {mode: "set", value: "manualInstructions"},
      currency: {mode: "inherit"}, offerMessageTemplate: {mode: "clear"},
      paymentInstructions: {mode: "inherit"},
      reusablePaymentPage: {mode: "clear"},
      expectedAmountMinor: {mode: "set", value: 25000}},
  };
  const deps = {db, serverTimestamp: () => Timestamp.fromMillis(50) as
    unknown as FirebaseFirestore.FieldValue};
  return {rows, updateTimes, readPaths, writePaths, command, deps,
    save: (overrides: Partial<ConfigureEventOfferPreferencesCommand> = {},
      actorUid = "host1") => configureEventOfferPreferences({actorUid,
      command: {...command, ...overrides}, deps})};
}

const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

test("published and legacy events save private terms without event writes",
  async () => {
    for (const legacy of [false, true]) {
      const event = richEvent();
      if (legacy) {
        delete event.publicationState;
      }
      const h = await setup(event);
      const before = JSON.stringify(h.rows.get("events/event1"));
      assert.deepEqual(await h.save(), {eventId: "event1",
        preferencesRevision: 1, replayed: false});
      assert.equal(JSON.stringify(h.rows.get("events/event1")), before);
      assert.equal(h.rows.get("eventSetupPreferences/event1")?.revision, 1);
      assert.deepEqual(h.writePaths.map((path) => path.split("/")[0]),
        ["eventSetupPreferences", "eventOfferConfigurationReceipts"]);
      for (const path of ["organizers/org1", "deletedUsers/host1",
        "events/event1", "organizerEventSetupDefaults/org1",
        "eventSetupPreferences/event1"]) {
        assert.ok(h.readPaths.includes(path));
      }
    }
  });

test("private event uses setupRevision without publishing or activating",
  async () => {
    const h = await setup(privateEvent());
    await h.save();
    assert.equal(h.rows.get("events/event1")?.publicationState, "private");
    assert.equal(h.rows.get("events/event1")?.setupRevision, 3);
    assert.equal(h.rows.get("eventSetupPreferences/event1")
      ?.paymentTerms && (h.rows.get("eventSetupPreferences/event1")
      ?.paymentTerms as Row).expectedAmountMinor, 25000);
  });

test("replay retains historical revision after edit and cancellation",
  async () => {
    const h = await setup();
    const first = await h.save();
    await h.save({requestId: "offer-settings-2",
      expectedPreferencesRevision: 1, intents: {...h.command.intents,
        paymentInstructions: {mode: "clear"}}});
    h.rows.set("events/event1", {...h.rows.get("events/event1"),
      status: "cancelled"});
    assert.deepEqual(await h.save(), {...first, replayed: true});
    assert.equal(h.rows.get("eventSetupPreferences/event1")?.revision, 2);
    await assert.rejects(h.save({intents: {...h.command.intents,
      expectedAmountMinor: {mode: "set", value: 1}}}),
    code("already-exists"));
  });

test("source, prefs and defaults changes reject stale review", async () => {
  for (const kind of ["source", "preferences", "defaults"]) {
    const h = await setup();
    if (kind === "source") {
      h.updateTimes.set("events/event1",
        new Timestamp(1_800_000_000, 123_457_000));
    }
    if (kind === "preferences") await h.save();
    if (kind === "defaults") {
      h.rows.set("organizerEventSetupDefaults/org1",
        {organizerId: "org1", revision: 2,
          eventSetup: {currency: "USD"}});
    }
    await assert.rejects(h.save({requestId: `stale-${kind}-1`}),
      code("aborted"));
  }
});

test("tenant, cancelled, manager, deleted and missing revision deny",
  async () => {
    for (const kind of ["foreign", "cancelled", "manager", "deleted",
      "missingRevision"]) {
      const h = await setup();
      if (kind === "foreign") {
        h.rows.set("events/event1",
          {...h.rows.get("events/event1"), organizerId: "other"});
      }
      if (kind === "cancelled") {
        h.rows.set("events/event1",
          {...h.rows.get("events/event1"), status: "cancelled"});
      }
      if (kind === "manager") {
        h.rows.set("organizers/org1",
          {...h.rows.get("organizers/org1"), ownerUserId: "other",
            hostUserId: "other"});
      }
      if (kind === "deleted") h.rows.set("deletedUsers/host1", {});
      if (kind === "missingRevision") {
        h.updateTimes.delete("events/event1");
      }
      await assert.rejects(h.save(), code(kind === "foreign" ? "not-found" :
        kind === "manager" ? "permission-denied" : "failed-precondition"));
      assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
    }
  });

test("unrecognized client fields cannot write", async () => {
  const h = await setup();
  await assert.rejects(h.save({providerActivated: true} as
    Partial<ConfigureEventOfferPreferencesCommand>),
  code("invalid-argument"));
  assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
});

test("malformed intent keys and values reject before writing", async () => {
  const h = await setup();
  const bad = [
    {...h.command.intents, extraSetting: {mode: "clear"}},
    {...h.command.intents, currency: {mode: "clear", value: "INR"}},
    {...h.command.intents, currency: {mode: "set", value: "INR",
      providerActivated: true}},
    {...h.command.intents, expectedAmountMinor: {mode: "inherit"}},
    {...h.command.intents, expectedAmountMinor: {mode: "set", value: -1}},
  ];
  for (const intents of bad) {
    await assert.rejects(h.save({intents: intents as
      ConfigureEventOfferPreferencesCommand["intents"]}),
    code("invalid-argument"));
  }
  assert.equal(h.rows.get("eventSetupPreferences/event1"), undefined);
  assert.equal(h.writePaths.length, 0);
});

test("changed organizer defaults cannot rewrite an issued offer", async () => {
  const h = await setup();
  const issuedOffer = {eventId: "event1", revision: 2,
    paymentSnapshot: {expectedAmountMinor: 12000, currency: "INR"}};
  h.rows.set("organizerEventOffers/issued", issuedOffer);
  h.rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
    revision: 2, eventSetup: {currency: "USD"}});
  await assert.rejects(h.save(), code("aborted"));
  assert.deepEqual(h.rows.get("organizerEventOffers/issued"), issuedOffer);
  const current = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(h.deps.db)});
  await h.save({requestId: "offer-settings-2",
    reviewedDefaultsHash: current.preferencesHash});
  assert.deepEqual(h.rows.get("organizerEventOffers/issued"), issuedOffer);
  assert.ok(h.writePaths.every((path) => !path.startsWith(
    "organizerEventOffers/")));
});

test("replay rechecks current manager and event tenant", async () => {
  for (const kind of ["manager", "tenant", "deleted"]) {
    const h = await setup();
    await h.save();
    if (kind === "manager") {
      h.rows.set("organizers/org1", {...h.rows.get("organizers/org1"),
        ownerUserId: "other", hostUserId: "other"});
    }
    if (kind === "tenant") {
      h.rows.set("events/event1", {...h.rows.get("events/event1"),
        organizerId: "other"});
    }
    if (kind === "deleted") {
      h.rows.set("deletedUsers/host1", {});
    }
    await assert.rejects(h.save(), code(kind === "manager" ?
      "permission-denied" : kind === "tenant" ? "not-found" :
        "failed-precondition"));
    assert.equal(h.rows.get("eventSetupPreferences/event1")?.revision, 1);
  }
});


test("settings preview resolves inherited changes without writing or reissuing",
  async () => {
    const h = await setup();
    await h.save();
    const issued = {paymentSnapshot: {expectedAmountMinor: 25000,
      currency: "INR", paymentInstructions: "Pay the organizer"}};
    h.rows.set("organizerEventOffers/issued", issued);
    h.rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
      revision: 2, eventSetup: {currency: "INR", offerValidityMinutes: 90,
        paymentInstructions: "Use the new account"}});
    const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
      organizerId: "org1", deps: eventSetupDefaultsDependencies(h.deps.db)});
    const command = {...h.command, requestId: "preview-change-1",
      expectedPreferencesRevision: 1,
      reviewedDefaultsHash: defaults.preferencesHash};
    h.writePaths.length = 0;
    const preview = await configureEventOfferPreferences({actorUid: "host1",
      command, deps: h.deps, previewOnly: true});
    assert.equal(preview.current?.preferences.offerValidityMinutes.value, 60);
    assert.equal(preview.candidate.preferences.offerValidityMinutes.value, 90);
    assert.equal(preview.candidate.preferences.expectedAmountMinor.value,
      25000);
    assert.equal(preview.existingOffersKeepOriginalTerms, true);
    assert.deepEqual(h.writePaths, []);
    assert.deepEqual(h.rows.get("organizerEventOffers/issued"), issued);
    await configureEventOfferPreferences({actorUid: "host1", command,
      deps: h.deps});
    assert.deepEqual(h.rows.get("eventSetupPreferences/event1")?.preferences,
      preview.candidate.preferences);
    assert.deepEqual(h.rows.get("organizerEventOffers/issued"), issued);
  });

test("preview cannot bypass current authority or stale review fences",
  async () => {
    for (const kind of ["manager", "source", "defaults", "preferences"]) {
      const h = await setup();
      await configureEventOfferPreferences({actorUid: "host1",
        command: h.command, deps: h.deps, previewOnly: true});
      if (kind === "manager") {
        h.rows.set("organizers/org1", {...h.rows.get("organizers/org1"),
          ownerUserId: "other", hostUserId: "other"});
      } else if (kind === "source") {
        h.updateTimes.set("events/event1", Timestamp.fromMillis(NOW));
      } else if (kind === "preferences") {
        await h.save({requestId: "other-request-1"});
      } else {
        h.rows.set("organizerEventSetupDefaults/org1", {organizerId: "org1",
          revision: 2, eventSetup: {currency: "USD"}});
      }
      await assert.rejects(h.save(), code(kind === "manager" ?
        "permission-denied" : "aborted"));
      await assert.rejects(configureEventOfferPreferences({actorUid: "host1",
        command: h.command, deps: h.deps, previewOnly: true}),
      code(kind === "manager" ? "permission-denied" : "aborted"));
    }
  });


test("settings requests cannot move to a different authenticated account",
  async () => {
    const h = await setup();
    await assert.rejects(h.save({expectedActorUid: "host2"}),
      code("permission-denied"));
    await assert.rejects(configureEventOfferPreferences({actorUid: "host1",
      command: {...h.command, expectedActorUid: "host2"}, deps: h.deps,
      previewOnly: true}), code("permission-denied"));
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
