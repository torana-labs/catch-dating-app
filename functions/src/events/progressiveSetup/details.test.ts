import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {getManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {updatePrivateEventDetails, UpdatePrivateEventDetailsCommand} from
  "./details";
import {ProgressiveSetupDependencies} from "./service";
import {contractValidator} from "../../shared/contractTestValidators";

const validateEventSetupReceiptDocument =
  contractValidator("EventSetupReceiptDocument");

type Row = Record<string, unknown>;

class Store {
  rows = new Map<string, Row>();
  writes: string[] = [];
  reads: string[] = [];
  collection(path: string) {
    return new Query(this, path);
  }
  async runTransaction<T>(fn: (tx: {
    get: (source: Ref | Query) => Promise<unknown>;
    update: (ref: Ref, value: Row) => void;
    create: (ref: Ref, value: Row) => void;
  }) => Promise<T>): Promise<T> {
    const pending: Array<() => void> = [];
    const tx = {
      get: async (source: Ref | Query) => {
        assert.equal(pending.length, 0, "all reads precede writes");
        return source.get();
      },
      update: (ref: Ref, value: Row) => pending.push(() => {
        const next = {...this.rows.get(ref.path), ...value};
        for (const [key, field] of Object.entries(value)) {
          if (field instanceof admin.firestore.FieldValue &&
              field.isEqual(admin.firestore.FieldValue.delete())) {
            delete next[key];
          }
        }
        this.rows.set(ref.path, next);
        this.writes.push(ref.path);
      }),
      create: (ref: Ref, value: Row) => pending.push(() => {
        assert.equal(this.rows.has(ref.path), false);
        this.rows.set(ref.path, value);
        this.writes.push(ref.path);
      }),
    };
    const result = await fn(tx);
    pending.forEach((write) => write());
    return result;
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}

class Ref {
  constructor(readonly store: Store, readonly path: string) {}
  async get() {
    this.store.reads.push(this.path);
    const row = this.store.rows.get(this.path);
    return {exists: !!row, data: () => row};
  }
}

class Query {
  constructor(readonly store: Store, readonly path: string,
    readonly eventId?: string) {}
  doc(id: string) {
    return new Ref(this.store, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    assert.equal(field, "eventId");
    assert.equal(op, "==");
    return new Query(this.store, this.path, value as string);
  }
  limit(count: number) {
    assert.equal(count, 1);
    return this;
  }
  async get() {
    this.store.reads.push(`${this.path}?eventId=${this.eventId}`);
    const docs = [...this.store.rows.entries()].filter(([path, row]) =>
      path.startsWith(`${this.path}/`) && row.eventId === this.eventId);
    return {empty: docs.length === 0, docs: docs.slice(0, 1)};
  }
}

const start = Date.parse("2026-10-18T13:00:00Z");

async function setup() {
  const store = new Store();
  store.rows.set("organizers/org1", {
    ownerUserId: "host1", hostUserId: "host1", hostUserIds: [],
    hostProfiles: [], status: "active", archived: false,
    hostDefaults: {eventPolicy: {admissionPreset: "openCapacity"}},
  });
  store.rows.set("organizerEventSetupDefaults/org1", {
    organizerId: "org1", revision: 1,
    eventSetup: {timezone: "Asia/Kolkata", usualDurationMinutes: 90,
      preferredVenueId: "venue1"},
  });
  store.rows.set("events/event1", {
    organizerId: "org1", name: "Mixer",
    eventCityId: "in-mh-mumbai", eventMarketId: "in-mh-mumbai",
    eventLocalDate: "2026-10-18", eventLocalStartTime: "18:30",
    eventTimezone: "Asia/Kolkata",
    startTime: admin.firestore.Timestamp.fromMillis(start),
    setupRevision: 1, publicationState: "private",
    publicRegistrationEnabled: false, status: "active",
    cancelledAt: null, cancellationReason: null,
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {},
    setupDefaults: {
      city: {value: {cityId: "in-mh-mumbai",
        marketId: "in-mh-mumbai"}, source: "event"},
      timezone: {value: "Asia/Kolkata", source: "event"},
      organizerDefaultsRevision: null,
      organizerDefaultsHash: "a".repeat(64),
    },
  });
  store.rows.set("organizerEventVenues/org1_venue1", {
    organizerId: "org1", venueId: "venue1", label: "Clubhouse",
    meetingLocation: {name: "Clubhouse", latitude: 19.1,
      longitude: 72.8}, status: "active",
    createdAt: admin.firestore.Timestamp.fromMillis(1),
    updatedAt: admin.firestore.Timestamp.fromMillis(1),
  });
  const db = store.db();
  const defaults = await getManagerEventSetupDefaults({actorUid: "host1",
    organizerId: "org1", deps: eventSetupDefaultsDependencies(db)});
  const deps: ProgressiveSetupDependencies = {
    db,
    timestampFromMillis: admin.firestore.Timestamp.fromMillis,
    serverTimestamp: () => admin.firestore.Timestamp.fromMillis(2) as
      unknown as FirebaseFirestore.FieldValue,
  };
  const command: UpdatePrivateEventDetailsCommand = {
    organizerId: "org1", eventId: "event1", requestId: "details-one",
    expectedSetupRevision: 1,
    reviewedDefaultsHash: defaults.preferencesHash,
    details: {durationMinutes: {mode: "inherit"},
      venue: {mode: "set", value: {name: "Courtyard"}}},
  };
  const save = (next = command, actorUid = "host1") =>
    updatePrivateEventDetails({actorUid, command: next, deps});
  return {store, command, save};
}

function code(error: unknown, expected: string) {
  return error instanceof HttpsError && error.code === expected;
}

test("named venue and inherited duration update private event", async () => {
  const {store, save} = await setup();
  const result = await save();
  assert.deepEqual(result, {eventId: "event1", setupRevision: 2,
    replayed: false});
  const event = store.rows.get("events/event1")!;
  assert.equal(event.meetingPoint, "Courtyard");
  assert.equal(event.meetingLocation, undefined);
  assert.equal((event.endTime as admin.firestore.Timestamp).toMillis(),
    start + 90 * 60_000);
  assert.equal(validateEventSetupReceiptDocument([...store.rows.entries()]
    .find(([path]) => path.startsWith("eventSetupReceipts/"))?.[1]), true);
  assert.equal(event.publicRegistrationEnabled, false);
  assert.equal(event.publicationState, "private");
  assert.equal(store.writes.filter((path) => path.startsWith("events/")).length,
    1);
});

test("replay is durable and conflicting request ID fails", async () => {
  const {store, command, save} = await setup();
  await save();
  const count = store.writes.length;
  assert.equal((await save()).replayed, true);
  assert.equal(store.writes.length, count);
  await assert.rejects(save({...command, details: {venue: {mode: "clear"}}}),
    (error) => code(error, "already-exists"));
});

test("authority, revision and defaults changes fail before writes",
  async () => {
    const {store, command, save} = await setup();
    await assert.rejects(save(command, "stranger"),
      (error) => code(error, "permission-denied"));
    await assert.rejects(save({...command, expectedSetupRevision: 3}),
      (error) => code(error, "aborted"));
    store.rows.get("organizerEventSetupDefaults/org1")!.revision = 2;
    await assert.rejects(save(), (error) => code(error, "aborted"));
    assert.equal(store.writes.length, 0);
  });

test("venue and duration remain editable after offers and roster import",
  async () => {
    const {store, save} = await setup();
    const offer = {eventId: "event1", status: "offered",
      paymentSnapshot: {expectedAmountMinor: 25000, currency: "INR"}};
    store.rows.set("organizerEventOffers/offer1", offer);
    store.rows.set("eventAttendees/person1", {eventId: "event1",
      status: "confirmed"});
    store.rows.get("events/event1")!.bookedCount = 1;
    await save();
    const event = store.rows.get("events/event1")!;
    assert.equal(event.meetingPoint, "Courtyard");
    assert.equal((event.endTime as admin.firestore.Timestamp).toMillis(),
      start + 90 * 60_000);
    assert.equal(event.bookedCount, 1);
    assert.deepEqual(store.rows.get("organizerEventOffers/offer1"), offer);
    assert.equal(store.rows.get("eventAttendees/person1")!.status,
      "confirmed");
    assert.ok(store.writes.every((path) => path === "events/event1" ||
      path.startsWith("eventSetupReceipts/")));
  });

test("format changes still reject an existing offer commitment", async () => {
  const {store, command, save} = await setup();
  store.rows.set("organizerEventOffers/offer1", {eventId: "event1",
    status: "offered"});
  await assert.rejects(save({...command, details: {eventFormat: {
    mode: "set", value: {version: 1, activityKind: "singlesMixer",
      interactionModel: "freeFormMixer"}}}}),
  (error) => code(error, "failed-precondition"));
  assert.equal(store.writes.length, 0);
});

test("unchanged format does not block later venue completion", async () => {
  const {store, command, save} = await setup();
  const format = {version: 1 as const, activityKind: "singlesMixer" as const,
    interactionModel: "freeFormMixer" as const};
  store.rows.get("events/event1")!.eventFormat = format;
  store.rows.set("eventAttendees/person1", {eventId: "event1"});
  await save({...command, details: {...command.details,
    eventFormat: {mode: "set", value: format}}});
  assert.deepEqual(store.rows.get("events/event1")!.eventFormat, format);
  assert.equal(store.rows.get("events/event1")!.meetingPoint, "Courtyard");
});

test("saved venue must remain owned and active", async () => {
  const {store, command, save} = await setup();
  const inherited = {...command, details: {venue: {mode: "inherit" as const}}};
  const venue = store.rows.get("organizerEventVenues/org1_venue1")!;
  venue.organizerId = "other";
  await assert.rejects(save(inherited),
    (error) => code(error, "permission-denied"));
  venue.organizerId = "org1";
  venue.status = "archived";
  await assert.rejects(save(inherited),
    (error) => code(error, "failed-precondition"));
  assert.equal(store.writes.length, 0);
});

test("missing saved venue cannot be inherited", async () => {
  const {store, command, save} = await setup();
  store.rows.delete("organizerEventVenues/org1_venue1");
  await assert.rejects(save({...command,
    details: {venue: {mode: "inherit"}}}),
  (error) => code(error, "failed-precondition"));
  assert.equal(store.writes.length, 0);
});

test("named venue replaces saved coordinates without stale map fields",
  async () => {
    const {store, command, save} = await setup();
    await save({...command, details: {venue: {mode: "inherit"}}});
    let event = store.rows.get("events/event1")!;
    assert.equal(event.sourceVenueId, "venue1");
    assert.equal((event.meetingLocation as Row).latitude, 19.1);
    await save({...command, requestId: "details-two",
      expectedSetupRevision: 2,
      details: {venue: {mode: "set", value: {name: "Courtyard"}}}});
    event = store.rows.get("events/event1")!;
    assert.equal(event.meetingPoint, "Courtyard");
    for (const key of ["meetingLocation", "sourceVenueId",
      "startingPointLat", "startingPointLng", "locationDetails"]) {
      assert.equal(event[key], undefined);
    }
  });

test("a private event under another organizer cannot be edited", async () => {
  const {store, save} = await setup();
  store.rows.get("events/event1")!.organizerId = "other";
  await assert.rejects(save(), (error) => code(error, "not-found"));
  assert.equal(store.writes.length, 0);
});

test("unpublishing does not permit silently moving the published schedule",
  async () => {
    const {store, command, save} = await setup();
    const event = store.rows.get("events/event1")!;
    event.firstPublishedAt = admin.firestore.Timestamp.fromMillis(1);
    event.endTime = admin.firestore.Timestamp.fromMillis(start + 90 * 60_000);
    await assert.rejects(save({...command, details: {
      durationMinutes: {mode: "set", value: 120},
    }}), (error) => code(error, "failed-precondition"));
    assert.equal(store.writes.length, 0);
    await save(); // Unchanged duration still permits completing venue details.
    assert.equal(store.rows.get("events/event1")!.meetingPoint, "Courtyard");
  });

test("map selection saves coordinates and clears saved venue provenance",
  async () => {
    const {store, command, save} = await setup();
    store.rows.get("events/event1")!.sourceVenueId = "oldVenue";
    await save({...command, details: {venue: {mode: "set", value: {
      name: "Courtyard", latitude: 19.2, longitude: 72.9,
      address: "Synthetic test address", placeId: "synthetic-place",
    }}}});
    const event = store.rows.get("events/event1")!;
    assert.deepEqual(event.meetingLocation, {name: "Courtyard",
      latitude: 19.2, longitude: 72.9, address: "Synthetic test address",
      placeId: "synthetic-place"});
    assert.equal(event.startingPointLat, 19.2);
    assert.equal(event.startingPointLng, 72.9);
    assert.equal(event.sourceVenueId, undefined);
    assert.equal(event.publicationState, "private");
  });


test("private content saves, replays and clears without publishing",
  async () => {
    const {store, command, save} = await setup();
    const details = {
      itinerary: [{id: "step1", kind: "gather" as const, offsetMinutes: 0,
        title: "Meet", durationMinutes: 5}],
      eventPhotos: [{id: "photo1", url: "https://example.com/photo.jpg",
        storagePath: "events/event1/media/photo1/original.jpg", position: 0,
        thumbnailUrl: null, thumbnailStoragePath: null,
        createdAt: {_seconds: 1, _nanoseconds: 0},
        updatedAt: {_seconds: 1, _nanoseconds: 0}}],
    };
    const request = {...command, details};
    await save(request as unknown as UpdatePrivateEventDetailsCommand);
    assert.equal((await save(request as unknown as
    UpdatePrivateEventDetailsCommand)).replayed, true);
    let event = store.rows.get("events/event1")!;
    assert.equal(event.photoUrl, "https://example.com/photo.jpg");
    const itinerary = event.itinerary as Array<{durationMinutes: number}>;
    assert.equal(itinerary[0].durationMinutes, 5);
    await save({...command, requestId: "clear-content",
      expectedSetupRevision: 2,
      details: {eventPhotos: [], itinerary: []}});
    event = store.rows.get("events/event1")!;
    assert.deepEqual(event.itinerary, []);
    assert.deepEqual(event.eventPhotos, []);
    assert.equal(event.photoUrl, null);
    assert.equal(event.publicationState, "private");
  });

test("private itinerary enforces route and schedule validation", async () => {
  const {store, command, save} = await setup();
  const step = {id: "step1", kind: "stop" as const,
    offsetMinutes: 20, title: "Stop"};
  await assert.rejects(save({...command, details: {
    itinerary: [{...step, routeDistanceMeters: 800}],
  }}), (error) => code(error, "invalid-argument"));
  await assert.rejects(save({...command, details: {
    durationMinutes: {mode: "set", value: 15}, itinerary: [step],
  }}), (error) => code(error, "invalid-argument"));
  assert.deepEqual(store.writes, []);
});


test("private guest notes persist and clear through revision-checked saves",
  async () => {
    const {store, command, save} = await setup();
    const format = {version: 1 as const, activityKind: "dinner" as const,
      interactionModel: "seatedTable" as const, activityDetails: {
        privateNotes: "Host-only note", publicDetails: {
          accessibility: "Step-free entrance", included: "Dinner",
        },
      }};
    await save({...command,
      details: {eventFormat: {mode: "set", value: format}}});
    assert.deepEqual(store.rows.get("events/event1")?.eventFormat, format);
    const cleared = {...format,
      activityDetails: {privateNotes: "Host-only note"}};
    await save({...command, requestId: "clear-guest-notes",
      expectedSetupRevision: 2,
      details: {eventFormat: {mode: "set", value: cleared}}});
    assert.deepEqual(store.rows.get("events/event1")?.eventFormat, cleared);
    assert.equal(store.rows.get("events/event1")?.publicationState, "private");
  });
