import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {listOfferEventTargets} from "./listOfferEventTargets";
import {validateOfferEventTargetListCallableResponse} from
  "../../shared/generated/validators/offerEventTargetListOutput";

type Row = Record<string, unknown>;
const NOW = Date.parse("2026-10-01T00:00:00Z");

class Store {
  rows = new Map<string, Row>();
  queryLimits: number[] = [];
  collection(path: string) {
    return new Query(this, path);
  }
  async runTransaction<T>(fn: (tx: {
    get: (source: Ref | Query) => Promise<unknown>;
  }) => Promise<T>): Promise<T> {
    return fn({get: (source) => source.get()});
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}

class Ref {
  constructor(readonly store: Store, readonly path: string) {}
  async get() {
    const row = this.store.rows.get(this.path);
    return {exists: !!row, data: () => row};
  }
}

class Query {
  constructor(readonly store: Store, readonly path: string,
    readonly filters: Array<[string, string, unknown]> = [],
    readonly after: [number, string] | null = null,
    readonly max = Infinity) {}
  doc(id: string) {
    return new Ref(this.store, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new Query(this.store, this.path,
      [...this.filters, [field, op, value]], this.after, this.max);
  }
  orderBy(field: unknown, direction: string) {
    assert.ok(field);
    assert.equal(direction, "asc");
    return this;
  }
  startAfter(time: Timestamp, id: string) {
    return new Query(this.store, this.path, this.filters,
      [time.toMillis(), id], this.max);
  }
  limit(max: number) {
    return new Query(this.store, this.path, this.filters, this.after, max);
  }
  async get() {
    this.store.queryLimits.push(this.max);
    const docs = [...this.store.rows.entries()]
      .filter(([path, row]) => path.startsWith(`${this.path}/`) &&
        this.filters.every(([field, op, expected]) => {
          const actual = row[field];
          return op === "==" ? actual === expected :
            op === ">=" && actual instanceof Timestamp &&
              expected instanceof Timestamp &&
              actual.toMillis() >= expected.toMillis();
        }))
      .sort(([aPath, a], [bPath, b]) =>
        (a.startTime as Timestamp).toMillis() -
          (b.startTime as Timestamp).toMillis() ||
          aPath.localeCompare(bPath))
      .filter(([path, row]) => !this.after ||
        (row.startTime as Timestamp).toMillis() > this.after[0] ||
        (row.startTime as Timestamp).toMillis() === this.after[0] &&
          path.split("/").at(-1)! > this.after[1])
      .slice(0, this.max)
      .map(([path, row]) => ({id: path.split("/").at(-1)!,
        data: () => row}));
    return {docs};
  }
}

function privateEvent(start: number): Row {
  return {
    organizerId: "org1", name: "New event",
    startTime: Timestamp.fromMillis(start),
    status: "active", publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false,
    eventCityId: "city1", eventMarketId: "market1",
    eventLocalDate: "2026-10-02", eventLocalStartTime: "18:00",
    eventTimezone: "Asia/Kolkata",
    setupDefaults: {
      city: {value: {cityId: "city1", marketId: "market1"},
        source: "event"},
      timezone: {value: "Asia/Kolkata", source: "event"},
      organizerDefaultsRevision: null,
      organizerDefaultsHash: "a".repeat(64),
    },
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    cancelledAt: null, cancellationReason: null,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {},
  };
}

function richEvent(start: number): Row {
  const source = JSON.parse(readFileSync(
    resolve(__dirname, "../../../../contracts/fixtures/valid/event_doc.json"),
    "utf8")) as Row;
  return {...source, organizerId: "org1",
    startTime: Timestamp.fromMillis(start),
    endTime: Timestamp.fromMillis(start + 3_600_000)};
}

function setup() {
  const store = new Store();
  store.rows.set("organizers/org1", {
    ownerUserId: "host1", hostUserId: "host1", hostUserIds: [],
    hostProfiles: [], status: "active", archived: false,
  });
  return store;
}

function list(store: Store, command: {
  organizerId: string; limit?: number; cursor?: string;
}, now = NOW, actorUid = "host1") {
  return listOfferEventTargets({actorUid, command, db: store.db(),
    nowMillis: () => now});
}

function code(error: unknown, expected: string) {
  return error instanceof HttpsError && error.code === expected;
}

test("one owner list includes private, published and rich legacy events",
  async () => {
    const store = setup();
    store.rows.set("events/a", privateEvent(NOW + 1_000));
    store.rows.set("events/b", {...richEvent(NOW + 2_000),
      publicationState: "published"});
    store.rows.set("events/c", {...richEvent(NOW + 3_000),
      name: undefined});
    store.rows.set("events/foreign", {...richEvent(NOW + 4_000),
      organizerId: "other"});
    store.rows.set("events/past", privateEvent(NOW - 1_000));
    store.rows.set("events/cancelled", {...privateEvent(NOW + 5_000),
      status: "cancelled"});
    const result = await list(store, {organizerId: "org1"});
    assert.equal(validateOfferEventTargetListCallableResponse(result), true);
    assert.deepEqual(result.events.map((row) => row.eventId),
      ["a", "b", "c"]);
    assert.deepEqual(result.events.map((row) => row.publicationState),
      ["private", "published", "published"]);
    assert.equal(result.events[2].name, null);
    assert.equal(result.events[2].timezone, null);
    assert.equal(result.events[2].setupRevision, null);
    assert.deepEqual(Object.keys(result.events[0]).sort(), ["eventId",
      "name", "publicationState", "setupRevision", "startTimeMillis",
      "timezone"]);
    assert.deepEqual(store.queryLimits, [21]);
  });

test("pagination preserves timestamp ties and first-page cutoff", async () => {
  const store = setup();
  for (const id of ["a", "b", "c"]) {
    store.rows.set(`events/${id}`, privateEvent(NOW + 1_000));
  }
  const first = await list(store, {organizerId: "org1", limit: 1});
  const second = await list(store, {organizerId: "org1", limit: 1,
    cursor: first.nextCursor!}, NOW + 500);
  const third = await list(store, {organizerId: "org1", limit: 1,
    cursor: second.nextCursor!}, NOW + 750);
  assert.deepEqual([first, second, third].flatMap((page) =>
    page.events.map((row) => row.eventId)), ["a", "b", "c"]);
  assert.equal(third.nextCursor, null);
  assert.deepEqual(store.queryLimits, [2, 2, 2]);
});

test("foreign cursor, manager and deleted account fail", async () => {
  const store = setup();
  store.rows.set("events/a", privateEvent(NOW + 1_000));
  const foreign = Buffer.from(JSON.stringify({v: 1,
    organizerId: "other", asOfMillis: NOW,
    lastStartTimeMillis: NOW + 1_000, lastEventId: "a"}))
    .toString("base64url");
  await assert.rejects(list(store, {organizerId: "org1", cursor: foreign}),
    (error) => code(error, "invalid-argument"));
  await assert.rejects(list(store, {organizerId: "org1"}, NOW,
    "stranger"), (error) => code(error, "permission-denied"));
  store.rows.set("deletedUsers/host1", {});
  await assert.rejects(list(store, {organizerId: "org1"}),
    (error) => code(error, "failed-precondition"));
});

test("malformed matching rows reject", async () => {
  const store = setup();
  store.rows.set("events/a", {...richEvent(NOW + 1_000),
    capacityLimit: undefined});
  await assert.rejects(list(store, {organizerId: "org1"}),
    (error) => code(error, "failed-precondition"));
});
