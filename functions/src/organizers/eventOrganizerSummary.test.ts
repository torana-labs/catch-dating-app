import assert from "node:assert/strict";
import test from "node:test";
import {
  eventNeedsOrganizerSummary,
  HIDDEN_ORGANIZER_SUMMARY,
  organizerSummaryChanged,
  organizerSummaryFrom,
  reconcileEventOrganizerSummary,
  refreshOrganizerEventSummaries,
} from "./eventOrganizerSummary";

type Row = Record<string, unknown>;

const endAt = (iso: string) => ({ms: Date.parse(iso)});

/** A just-enough Firestore: transactions, equality + range queries. */
class FakeStore {
  rows = new Map<string, Row>();
  writes: string[] = [];
  collection(name: string) {
    return new FakeQuery(this, name, []);
  }
  snapshot(path: string) {
    const row = this.rows.get(path);
    return {
      exists: row !== undefined, id: path.split("/").at(-1)!,
      data: () => row === undefined ? undefined : structuredClone(row),
      get: (field: string) => row?.[field],
    };
  }
  async runTransaction<T>(fn: (tx: {
    get: (ref: FakeRef) => Promise<unknown>;
    update: (ref: FakeRef, data: Row) => void;
  }) => Promise<T>): Promise<T> {
    return fn({
      get: async (ref) => this.snapshot(ref.path),
      update: (ref, data) => {
        this.writes.push(ref.path);
        this.rows.set(ref.path, {...this.rows.get(ref.path), ...data});
      },
    });
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}

class FakeRef {
  constructor(readonly path: string, readonly store: FakeStore) {}
  async get() {
    return this.store.snapshot(this.path);
  }
}

class FakeQuery {
  constructor(readonly store: FakeStore, readonly name: string,
    readonly filters: Array<[string, string, unknown]>,
    readonly max = Infinity, readonly after: string | null = null) {}
  doc(id: string) {
    return new FakeRef(`${this.name}/${id}`, this.store);
  }
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.store, this.name,
      [...this.filters, [field, op, value]], this.max, this.after);
  }
  orderBy() {
    return this;
  }
  limit(max: number) {
    return new FakeQuery(this.store, this.name, this.filters, max, this.after);
  }
  startAfter(doc: {id: string}) {
    return new FakeQuery(this.store, this.name, this.filters, this.max,
      doc.id);
  }
  async get() {
    const docs = [...this.store.rows.entries()]
      .filter(([path]) => path.startsWith(`${this.name}/`))
      .filter(([, row]) => this.filters.every(([field, op, value]) => {
        const actual = row[field];
        if (op === "==") return actual === value;
        return (actual as {ms: number}).ms >= (value as {ms: number}).ms;
      }))
      .map(([path]) => path.slice(this.name.length + 1))
      .sort()
      .filter((id) => this.after === null || id > this.after)
      .slice(0, this.max)
      .map((id) => this.store.snapshot(`${this.name}/${id}`));
    return {docs};
  }
}

const NOW = "2026-11-18T10:00:00.000Z";
const deps = (store: FakeStore) => ({
  firestore: () => store.db(),
  nowTimestamp: () => endAt(NOW) as never,
});

const publicOrganizer = (patch: Row = {}): Row => ({
  name: "Bandra Run Club", description: "x", location: "mumbai",
  locationCityId: "mumbai", locationMarketId: "mumbai", area: "Bandra",
  hostName: "Asha", hostUserId: "host-1", tags: ["running"], rating: 4.6,
  status: "active", archived: false, appVisibility: "discoverable",
  followerCount: 99, nextEventAt: null, nextEventLabel: null, ...patch,
});

const event = (organizerId: string, end: string, patch: Row = {}): Row => ({
  organizerId, endTime: endAt(end), name: "Run", ...patch,
});

test("the summary copies only what Explore shows and filters on", () => {
  assert.deepEqual(organizerSummaryFrom(publicOrganizer({synthetic: true})), {
    name: "Bandra Run Club", location: "mumbai", area: "Bandra",
    hostName: "Asha", tags: ["running"], rating: 4.6, synthetic: true,
    appVisibility: "discoverable", status: "active", archived: false,
  });
});

test("a missing organizer reads as the hidden summary", () => {
  assert.deepEqual(organizerSummaryFrom(undefined), HIDDEN_ORGANIZER_SUMMARY);
  assert.equal(HIDDEN_ORGANIZER_SUMMARY.appVisibility, "hidden");
  assert.equal(HIDDEN_ORGANIZER_SUMMARY.archived, true);
  assert.notEqual(organizerSummaryFrom(undefined).tags,
    HIDDEN_ORGANIZER_SUMMARY.tags);
});

test("only a summary field change counts as a summary change", () => {
  const base = publicOrganizer();
  assert.equal(organizerSummaryChanged(base, {...base, followerCount: 100,
    nextEventAt: "2026-12-01", reviewCount: 3}), false);
  assert.equal(organizerSummaryChanged(base, {...base, rating: 4.7}), true);
  assert.equal(organizerSummaryChanged(base, {...base, tags: []}), true);
  assert.equal(organizerSummaryChanged(base, {...base,
    appVisibility: "hidden"}), true);
  assert.equal(organizerSummaryChanged(undefined, base), true);
  assert.equal(organizerSummaryChanged(base, undefined), true);
  assert.equal(organizerSummaryChanged(undefined, undefined), false);
});

test("an event write needs a summary on create, organizer change or none",
  () => {
    const summary = organizerSummaryFrom(publicOrganizer());
    const existing = {organizerId: "o1", organizerSummary: summary};
    assert.equal(eventNeedsOrganizerSummary(undefined, undefined), false);
    assert.equal(eventNeedsOrganizerSummary(existing, undefined), false);
    assert.equal(eventNeedsOrganizerSummary(undefined, existing), true);
    assert.equal(eventNeedsOrganizerSummary({organizerId: "o1"},
      {organizerId: "o2", organizerSummary: summary}), true);
    assert.equal(eventNeedsOrganizerSummary({organizerId: "o1"},
      {organizerId: "o1"}), true);
    // Booking counters and the summary's own write never start another.
    assert.equal(eventNeedsOrganizerSummary(existing,
      {...existing, bookedCount: 3}), false);
    assert.equal(eventNeedsOrganizerSummary({organizerId: "o1"}, existing),
      false);
  });

test("reconcile writes the summary once, then writes nothing", async () => {
  const store = new FakeStore();
  store.rows.set("publicOrganizers/o1", publicOrganizer());
  store.rows.set("events/e1", event("o1", "2026-11-20T10:00:00.000Z"));
  assert.equal(await reconcileEventOrganizerSummary("e1", deps(store)),
    "written");
  assert.deepEqual(store.rows.get("events/e1")?.organizerSummary,
    organizerSummaryFrom(publicOrganizer()));
  // Only the summary changes: no updatedAt, no other field.
  assert.deepEqual(Object.keys(store.rows.get("events/e1") ?? {}).sort(),
    ["endTime", "name", "organizerId", "organizerSummary"]);
  assert.equal(await reconcileEventOrganizerSummary("e1", deps(store)),
    "unchanged");
  assert.deepEqual(store.writes, ["events/e1"]);
});

test("reconcile writes the hidden summary for a missing organizer, and " +
  "leaves a missing event alone", async () => {
  const store = new FakeStore();
  store.rows.set("events/e1", event("ghost", "2026-11-20T10:00:00.000Z"));
  assert.equal(await reconcileEventOrganizerSummary("e1", deps(store)),
    "written");
  assert.deepEqual(store.rows.get("events/e1")?.organizerSummary,
    HIDDEN_ORGANIZER_SUMMARY);
  assert.equal(await reconcileEventOrganizerSummary("nope", deps(store)),
    "absent");
  store.rows.set("events/bad", {name: "no organizer"});
  assert.equal(await reconcileEventOrganizerSummary("bad", deps(store)),
    "absent");
});

test("an organizer change rewrites only events that have not ended, and " +
  "only where the summary differs", async () => {
  const store = new FakeStore();
  const before = organizerSummaryFrom(publicOrganizer());
  store.rows.set("publicOrganizers/o1", publicOrganizer({rating: 4.9}));
  store.rows.set("events/live", event("o1", "2026-11-18T10:00:00.000Z",
    {organizerSummary: before}));
  store.rows.set("events/upcoming", event("o1", "2026-12-01T10:00:00.000Z",
    {organizerSummary: before}));
  store.rows.set("events/current", event("o1", "2026-12-02T10:00:00.000Z",
    {organizerSummary: organizerSummaryFrom(publicOrganizer({rating: 4.9}))}));
  store.rows.set("events/missing", event("o1", "2026-12-03T10:00:00.000Z"));
  store.rows.set("events/ended", event("o1", "2026-11-01T10:00:00.000Z",
    {organizerSummary: before}));
  store.rows.set("events/other", event("o2", "2026-12-01T10:00:00.000Z",
    {organizerSummary: before}));

  assert.equal(await refreshOrganizerEventSummaries("o1", deps(store)), 3);
  assert.deepEqual(store.writes.sort(),
    ["events/live", "events/missing", "events/upcoming"]);
  assert.equal(
    (store.rows.get("events/upcoming")?.organizerSummary as Row).rating, 4.9);
  // Ended events keep the summary they had; other organizers are untouched.
  assert.deepEqual(store.rows.get("events/ended")?.organizerSummary, before);
  assert.deepEqual(store.rows.get("events/other")?.organizerSummary, before);

  store.writes.length = 0;
  assert.equal(await refreshOrganizerEventSummaries("o1", deps(store)), 0);
  assert.deepEqual(store.writes, []);
});

test("a removed projection hides the organizer's coming events", async () => {
  const store = new FakeStore();
  store.rows.set("events/e1", event("o1", "2026-12-01T10:00:00.000Z",
    {organizerSummary: organizerSummaryFrom(publicOrganizer())}));
  assert.equal(await refreshOrganizerEventSummaries("o1", deps(store)), 1);
  assert.deepEqual(store.rows.get("events/e1")?.organizerSummary,
    HIDDEN_ORGANIZER_SUMMARY);
});

test("fan-out pages through every coming event", async () => {
  const store = new FakeStore();
  store.rows.set("publicOrganizers/o1", publicOrganizer());
  for (let i = 0; i < 450; i++) {
    store.rows.set(`events/e${String(i).padStart(4, "0")}`,
      event("o1", "2026-12-01T10:00:00.000Z"));
  }
  assert.equal(await refreshOrganizerEventSummaries("o1", deps(store)), 450);
  assert.equal(await refreshOrganizerEventSummaries("o1", deps(store)), 0);
});
