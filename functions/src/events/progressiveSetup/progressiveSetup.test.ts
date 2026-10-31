import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {getPrivateEventSetup} from "./readModel";
import {getManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {localStartMillis, normalizePrivateEventBasics} from "./basics";
import {resolveField, resolveProgressiveSetupDefaults} from "./defaults";
import {
  createPrivateEventSetup,
  ProgressiveSetupDependencies,
  updatePrivateEventBasics,
} from "./service";

type Row = Record<string, unknown>;

class FakeStore {
  private rows = new Map<string, Row>();
  private nextId = 0;

  collection(path: string) {
    return {doc: (id?: string) => ({path: `${path}/${id ?? ++this.nextId}`,
      id: id ?? String(this.nextId)}),
    where: (_field: string, _op: string, eventId: string) => ({
      limit: (count: number) => {
        assert.equal(count, 1);
        return {path, queryEventId: eventId};
      },
    })};
  }

  seed(path: string, value: Row) {
    this.rows.set(path, value);
  }

  read(path: string): Row | undefined {
    return this.rows.get(path);
  }

  async runTransaction<T>(callback: (tx: {
    get: (ref: {path: string}) => Promise<{
      exists: boolean; data: () => Row | undefined;
    }>;
    create: (ref: {path: string}, data: Row) => void;
    update: (ref: {path: string}, data: Row) => void;
  }) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = [];
    const tx = {
      get: async (ref: {path: string; queryEventId?: string}) => ({
        exists: this.rows.has(ref.path),
        data: () => this.rows.get(ref.path),
        empty: ![...this.rows].some(([path, row]) =>
          path.startsWith(`${ref.path}/`) &&
          row.eventId === ref.queryEventId),
      }),
      create: (ref: {path: string}, data: Row) => writes.push(() => {
        assert.equal(this.rows.has(ref.path), false);
        this.rows.set(ref.path, data);
      }),
      update: (ref: {path: string}, data: Row) => writes.push(() => {
        const existing = this.rows.get(ref.path);
        assert.ok(existing);
        this.rows.set(ref.path, {...existing, ...data});
      }),
    };
    const result = await callback(tx);
    writes.forEach((write) => write());
    return result;
  }
}

const mumbai = {cityId: "in-mh-mumbai", marketId: "in-mh-mumbai"};
const basics = {
  name: "  Sunday Mixer  ",
  city: {mode: "set" as const, value: mumbai},
  localDate: "2026-10-18",
  localStartTime: "18:30",
  timezone: {mode: "set" as const, value: "Asia/Kolkata"},
};

function setup() {
  const store = new FakeStore();
  store.seed("organizers/org1", {
    hostUserId: "host1", hostUserIds: [], hostProfiles: [],
    ownerUserId: "host1", status: "active", archived: false,
    locationCityId: mumbai.cityId,
    locationMarketId: mumbai.marketId, hostDefaults: {},
  });
  let editable = true;
  const deps: ProgressiveSetupDependencies = {
    db: store as unknown as FirebaseFirestore.Firestore,
    timestampFromMillis: Timestamp.fromMillis,
    serverTimestamp: () => Timestamp.fromMillis(1000) as unknown as
      FirebaseFirestore.FieldValue,
    assertBasicsEditable: async () => {
      if (!editable) {
        throw new HttpsError("failed-precondition", "Commitment exists.");
      }
    },
  };
  return {store, deps,
    setEditable: (value: boolean) => editable = value};
}

function code(error: unknown): string | undefined {
  return error instanceof HttpsError ? error.code : undefined;
}

test("only valid unambiguous local time resolves to an instant", () => {
  assert.equal(localStartMillis("2026-10-18", "18:30", "Asia/Kolkata"),
    Date.UTC(2026, 9, 18, 13, 0));
  assert.throws(() => localStartMillis("2026-02-30", "18:30",
    "Asia/Kolkata"), (error) => code(error) === "invalid-argument");
  assert.throws(() => localStartMillis("2026-03-08", "02:30",
    "America/New_York"), (error) => code(error) === "invalid-argument");
  assert.throws(() => localStartMillis("2026-11-01", "01:30",
    "America/New_York"), (error) => code(error) === "invalid-argument");
});

test("defaults distinguish inherit, set and optional clear", () => {
  const organizer = {city: mumbai, timezone: "Asia/Kolkata", revision: 3};
  const reviewed = resolveProgressiveSetupDefaults({
    city: {mode: "inherit"}, timezone: {mode: "inherit"}, organizer,
  });
  assert.equal(reviewed.city.source, "organizer");
  assert.equal(reviewed.organizerDefaultsRevision, 3);
  assert.equal(resolveField({mode: "clear"}, "old", true).value, null);
  assert.throws(() => resolveField({mode: "clear"}, "old", false),
    (error) => code(error) === "invalid-argument");
  assert.throws(() => normalizePrivateEventBasics({
    basics: {...basics, city: {mode: "inherit"}}, defaults: organizer,
  }), (error) => code(error) === "failed-precondition");
  assert.throws(() => normalizePrivateEventBasics({
    basics: {...basics, city: {mode: "inherit"},
      reviewedDefaultsHash: "stale"}, defaults: organizer,
  }), (error) => code(error) === "aborted");
});

test("private create is idempotent", async () => {
  const h = setup();
  const command = {organizerId: "org1", requestId: "request-111", basics};
  const first = await createPrivateEventSetup({actorUid: "host1",
    command, deps: h.deps});
  const saved = h.store.read(`events/${first.eventId}`);
  assert.ok(saved);
  assert.equal(saved.name, "Sunday Mixer");
  assert.equal(saved.publicationState, "private");
  assert.equal(saved.publicRegistrationEnabled, false);
  assert.equal(validateEventDocument(saved), true,
    JSON.stringify(validateEventDocument.errors));
  for (const key of ["endTime", "meetingLocation", "capacityLimit",
    "priceInPaise", "discoveryMarketId", "eventOrigin"]) {
    assert.equal(Object.hasOwn(saved, key), false, key);
  }
  const replay = await createPrivateEventSetup({actorUid: "host1",
    command, deps: h.deps});
  assert.deepEqual(replay, {...first, replayed: true});
  await assert.rejects(createPrivateEventSetup({actorUid: "host1",
    command: {...command, basics: {...basics, name: "Changed"}},
    deps: h.deps}), (error) => code(error) === "already-exists");
  h.store.seed("organizers/org1", {...h.store.read("organizers/org1"),
    ownerUserId: "other", hostUserId: "other"});
  await assert.rejects(createPrivateEventSetup({actorUid: "host1",
    command, deps: h.deps}), (error) => code(error) === "permission-denied");
});

test("private basics update fences revision and commitments", async () => {
  const h = setup();
  const created = await createPrivateEventSetup({actorUid: "host1",
    command: {organizerId: "org1", requestId: "request-111", basics},
    deps: h.deps});
  const command = {organizerId: "org1", eventId: created.eventId,
    requestId: "request-222", expectedSetupRevision: 1,
    basics: {...basics, name: "New name"}};
  h.setEditable(false);
  await assert.rejects(updatePrivateEventBasics({actorUid: "host1",
    command, deps: h.deps}), (error) => code(error) === "failed-precondition");
  h.setEditable(true);
  const updated = await updatePrivateEventBasics({actorUid: "host1",
    command, deps: h.deps});
  assert.equal(updated.setupRevision, 2);
  assert.equal(h.store.read(`events/${created.eventId}`)?.name, "New name");
  const replay = await updatePrivateEventBasics({actorUid: "host1",
    command, deps: h.deps});
  assert.deepEqual(replay, {...updated, replayed: true});
  await assert.rejects(updatePrivateEventBasics({actorUid: "host1",
    command: {...command, requestId: "request-333"}, deps: h.deps}),
  (error) => code(error) === "aborted");
});

test("uncommitted basics edits preserve venue and shift configured duration",
  async () => {
    const h = setup();
    const created = await createPrivateEventSetup({actorUid: "host1",
      command: {organizerId: "org1", requestId: "details-create", basics},
      deps: h.deps});
    const path = `events/${created.eventId}`;
    const original = h.store.read(path)!;
    const start = (original.startTime as Timestamp).toMillis();
    const venue = {name: "Clubhouse", latitude: 19.1, longitude: 72.8};
    h.store.seed(path, {...original, endTime: Timestamp.fromMillis(start +
      90 * 60_000), meetingLocation: venue, meetingPoint: venue.name});
    const command = {organizerId: "org1", eventId: created.eventId,
      requestId: "details-basics-update", expectedSetupRevision: 1,
      basics: {...basics, localStartTime: "19:30"}};
    await updatePrivateEventBasics({actorUid: "host1", command, deps: h.deps});
    const updated = h.store.read(path)!;
    assert.equal((updated.startTime as Timestamp).toMillis(),
      start + 60 * 60_000);
    assert.equal((updated.endTime as Timestamp).toMillis(),
      start + 150 * 60_000);
    assert.deepEqual(updated.meetingLocation, venue);
    assert.equal(updated.bookedCount, 0);
    assert.deepEqual(await updatePrivateEventBasics({actorUid: "host1",
      command, deps: h.deps}), {eventId: created.eventId,
      setupRevision: 2, replayed: true});
  });

test("basics edit preserves venue city and existing plan dependencies",
  async () => {
    for (const patch of [{meetingPoint: "Existing venue"},
      {eventSuccessPlanId: "existing-plan"}, {endTime: {}},
      {organizerId: "foreign"}]) {
      const h = setup();
      const created = await createPrivateEventSetup({actorUid: "host1",
        command: {organizerId: "org1", requestId: "guard-create", basics},
        deps: h.deps});
      const path = `events/${created.eventId}`;
      h.store.seed(path, {...h.store.read(path), ...patch});
      const before = h.store.read(path);
      const nextBasics = patch.meetingPoint ? {...basics,
        city: {mode: "set" as const, value: {
          cityId: "in-mp-indore", marketId: "in-mp-indore",
        }}} : basics;
      await assert.rejects(updatePrivateEventBasics({actorUid: "host1",
        command: {organizerId: "org1", eventId: created.eventId,
          requestId: "guard-edit-1", expectedSetupRevision: 1,
          basics: nextBasics}, deps: h.deps}), (error) =>
        error instanceof HttpsError && (patch.meetingPoint ?
          error.message.includes("Clear the venue") :
          ["failed-precondition", "not-found"].includes(error.code)));
      assert.deepEqual(h.store.read(path), before);
    }
  });

test("manager read uses current commitment authority for editing controls",
  async () => {
    const h = setup();
    const created = await createPrivateEventSetup({actorUid: "host1",
      command: {organizerId: "org1", requestId: "editable-create", basics},
      deps: h.deps});
    const params = {actorUid: "host1", db: h.deps.db,
      command: {organizerId: "org1", eventId: created.eventId}};
    let result = await getPrivateEventSetup(params);
    assert.equal(result.canEditBasics, true);
    assert.equal(result.canChangeCity, true);
    const path = `events/${created.eventId}`;
    h.store.seed(path, {...h.store.read(path), meetingPoint: "Clubhouse"});
    result = await getPrivateEventSetup(params);
    assert.equal(result.canEditBasics, true);
    assert.equal(result.canChangeCity, false);
    h.store.seed("organizerEventOffers/offer", {eventId: created.eventId,
      status: "withdrawn"});
    result = await getPrivateEventSetup(params);
    assert.equal(result.canEditBasics, false);
    assert.equal(result.canChangeCity, false);
  });


test("replays preserve the original revision after later edits", async () => {
  const h = setup();
  const create = {organizerId: "org1", requestId: "request-create", basics};
  const created = await createPrivateEventSetup({actorUid: "host1",
    command: create, deps: h.deps});
  const edit = {organizerId: "org1", eventId: created.eventId,
    requestId: "request-edit1", expectedSetupRevision: 1,
    basics: {...basics, name: "First edit"}};
  const edited = await updatePrivateEventBasics({actorUid: "host1",
    command: edit, deps: h.deps});
  await updatePrivateEventBasics({actorUid: "host1", command: {...edit,
    requestId: "request-edit2", expectedSetupRevision: 2,
    basics: {...basics, name: "Second edit"}}, deps: h.deps});
  assert.deepEqual(await createPrivateEventSetup({actorUid: "host1",
    command: create, deps: h.deps}), {...created, replayed: true});
  assert.deepEqual(await updatePrivateEventBasics({actorUid: "host1",
    command: edit, deps: h.deps}), {...edited, replayed: true});
  assert.equal(h.store.read(`events/${created.eventId}`)?.setupRevision, 3);
  assert.equal(h.store.read(`events/${created.eventId}`)?.name, "Second edit");
});


test("manager reopens basics without rich fields or secrets", async () => {
  const h = setup();
  const created = await createPrivateEventSetup({actorUid: "host1",
    command: {organizerId: "org1", requestId: "request-read", basics},
    deps: h.deps});
  const path = `events/${created.eventId}`;
  h.store.seed(path, {...h.store.read(path), privatePaymentSecret: "never"});
  const params = {actorUid: "host1", db: h.deps.db,
    command: {organizerId: "org1", eventId: created.eventId}};
  const result = await getPrivateEventSetup(params);
  assert.equal(result.name, "Sunday Mixer");
  assert.equal(result.detailsConfigured, false);
  assert.deepEqual(result.eventDetails, {endTimeMillis: null, venueName: null,
    description: null, admissionTerms: null, distanceKm: null, pace: null,
    itinerary: [], eventPhotos: [],
    sourceVenueId: null, eventFormat: null, meetingLocation: null});
  assert.equal(result.startTimeMillis, Date.UTC(2026, 9, 18, 13));
  assert.equal(Object.hasOwn(result, "privatePaymentSecret"), false);
  await assert.rejects(getPrivateEventSetup({...params, actorUid: "stranger"}),
    (error) => code(error) === "permission-denied");
  h.store.seed("deletedUsers/host1", {});
  await assert.rejects(getPrivateEventSetup(params),
    (error) => code(error) === "failed-precondition");
});

test("setup reads reject foreign, invalid and published records", async () => {
  const h = setup();
  const created = await createPrivateEventSetup({actorUid: "host1",
    command: {organizerId: "org1", requestId: "request-read", basics},
    deps: h.deps});
  const path = `events/${created.eventId}`;
  const original = h.store.read(path);
  const params = {actorUid: "host1", db: h.deps.db,
    command: {organizerId: "org1", eventId: created.eventId}};
  for (const [patch, expected] of [
    [{organizerId: "org2"}, "not-found"],
    [{publicationState: "published"}, "failed-precondition"],
    [{setupRevision: 0}, "failed-precondition"],
    [{eventTimezone: null}, "failed-precondition"],
    [{endTime: {}}, "failed-precondition"],
  ] as const) {
    h.store.seed(path, {...original, ...patch});
    await assert.rejects(getPrivateEventSetup(params),
      (error) => code(error) === expected);
  }
});

test("setup payload rejects client authority and unknown fields", async () => {
  const h = setup();
  await assert.rejects(createPrivateEventSetup({actorUid: "host1",
    command: {organizerId: "org1", requestId: "request-bad", basics,
      publicationState: "published"} as never, deps: h.deps}),
  (error) => code(error) === "invalid-argument");
  assert.equal(h.store.read("events/1"), undefined);
});


test("creation uses reviewed private defaults and preserves the event snapshot",
  async () => {
    const h = setup();
    const defaultsPath = "organizerEventSetupDefaults/org1";
    h.store.seed(defaultsPath, {organizerId: "org1", revision: 1,
      eventSetup: {timezone: "Asia/Kolkata"}});
    const reviewed = await getManagerEventSetupDefaults({actorUid: "host1",
      organizerId: "org1", deps: eventSetupDefaultsDependencies(h.deps.db)});
    const command = {organizerId: "org1", requestId: "request-private-tz",
      basics: {...basics, city: {mode: "inherit" as const},
        timezone: {mode: "inherit" as const},
        reviewedDefaultsHash: reviewed.basicsReviewedHash}};
    const created = await createPrivateEventSetup({actorUid: "host1",
      command, deps: h.deps});
    const eventPath = `events/${created.eventId}`;
    assert.equal(h.store.read(eventPath)?.eventTimezone, "Asia/Kolkata");
    h.store.seed(defaultsPath, {organizerId: "org1", revision: 2,
      eventSetup: {timezone: "Asia/Dubai"}});
    await assert.rejects(createPrivateEventSetup({actorUid: "host1",
      command: {...command, requestId: "request-stale-tz"}, deps: h.deps}),
    (error) => code(error) === "aborted");
    assert.equal(h.store.read(eventPath)?.eventTimezone, "Asia/Kolkata");
    assert.deepEqual(await createPrivateEventSetup({actorUid: "host1",
      command, deps: h.deps}), {...created, replayed: true});
  });
