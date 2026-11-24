import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {contractValidator} from "../shared/contractTestValidators";
import type {PublicEventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  backfillPublicEvents, projectPublicEvent, publicEventPriceHidden,
  reconcilePublicEvent, PRIVATE_EVENT_FIELDS, PUBLIC_EVENT_DERIVED_FIELDS,
  PUBLIC_EVENT_FIELDS,
} from "./publicEventProjection";

type Row = Record<string, unknown>;

const fixture = (name: string): Row => JSON.parse(readFileSync(
  `../contracts/fixtures/valid/${name}.json`, "utf8"));
const eventDoc = () => fixture("event_doc");
const eventsSchema = JSON.parse(readFileSync(
  "../contracts/firestore/events.schema.json", "utf8"));
const publicSchema = JSON.parse(readFileSync(
  "../contracts/firestore/public_events.schema.json", "utf8"));
const validatePublic =
  contractValidator<PublicEventDocument>("PublicEventDocument");

class FakeStore {
  rows = new Map<string, Row>();
  writes: string[] = [];
  collection(name: string) {
    return new FakeQuery(this, name);
  }
  async runTransaction<T>(fn: (tx: {
    get: (ref: FakeRef) => Promise<unknown>;
    set: (ref: FakeRef, data: Row) => void;
    delete: (ref: FakeRef) => void;
  }) => Promise<T>): Promise<T> {
    return fn({
      get: async (ref) => this.snapshot(ref.path),
      set: (ref, data) => {
        this.writes.push(`set ${ref.path}`);
        this.rows.set(ref.path, structuredClone(data));
      },
      delete: (ref) => {
        this.writes.push(`delete ${ref.path}`);
        this.rows.delete(ref.path);
      },
    });
  }
  snapshot(path: string) {
    const row = this.rows.get(path);
    return {exists: row !== undefined, id: path.split("/").at(-1)!,
      data: () => row === undefined ? undefined : structuredClone(row)};
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}

class FakeRef {
  constructor(readonly store: FakeStore, readonly path: string) {}
  async get() {
    return this.store.snapshot(this.path);
  }
}

class FakeQuery {
  constructor(readonly store: FakeStore, readonly name: string,
    readonly max = Infinity, readonly after: string | null = null) {}
  doc(id: string) {
    return new FakeRef(this.store, `${this.name}/${id}`);
  }
  orderBy() {
    return this;
  }
  limit(max: number) {
    return new FakeQuery(this.store, this.name, max, this.after);
  }
  startAfter(doc: {id: string}) {
    return new FakeQuery(this.store, this.name, this.max, doc.id);
  }
  async get() {
    const docs = [...this.store.rows.keys()]
      .filter((path) => path.startsWith(`${this.name}/`))
      .map((path) => path.slice(this.name.length + 1))
      .sort()
      .filter((id) => this.after === null || id > this.after)
      .slice(0, this.max)
      .map((id) => this.store.snapshot(`${this.name}/${id}`));
    return {docs};
  }
}

const deps = (store: FakeStore) => ({firestore: () => store.db()});

test("every events field is either public or private, and the contract " +
  "matches the allowlist", () => {
  const publicFields = [...PUBLIC_EVENT_FIELDS, ...PUBLIC_EVENT_DERIVED_FIELDS];
  assert.deepEqual(publicFields.slice().sort(),
    Object.keys(publicSchema.properties).sort());
  const classified =
    new Set<string>([...publicFields, ...PRIVATE_EVENT_FIELDS]);
  const unclassified = Object.keys(eventsSchema.properties)
    .filter((field) => !classified.has(field));
  assert.deepEqual(unclassified, [], "classify new events fields here");
  for (const field of PRIVATE_EVENT_FIELDS) {
    assert.equal(field in publicSchema.properties, false, field);
  }
});

test("the copy of the canonical fixture is the public fixture", () => {
  const projection = projectPublicEvent(eventDoc());
  assert.deepEqual(projection, fixture("public_event_doc"));
  assert.ok(validatePublic(projection),
    JSON.stringify(validatePublic.errors));
});

test("gender, cohort and pair counts, internals and the join id never " +
  "reach the copy", () => {
  const source = {...eventDoc(), adminSearch: {tokens: ["x"]},
    seedPrefix: "demo-1", scenario: "s", demoOps: {}, demoOpsId: "d",
    demoOpsCommand: "c", sourceVenueId: "venue-1",
    crossPathsPairHeldCount: 1, crossPathsPairConfirmedCount: 2,
    crossPathsPairHeldCohortCounts: {womenInterestedInMen: 1},
    eventOrigin: {mode: "externalCompanion", bookingAuthority: "external",
      rosterAuthority: "hostImport", provider: "luma",
      externalEventId: "evt-provider-1",
      externalEventUrl: "https://tickets.example.com/e/1",
      sourceExternalEventId: "src-1", adapterVersion: "v1",
      connectedAt: {_seconds: 1, _nanoseconds: 0}, connectedBy: "host-1"},
    runtimeAccess: {enabled: true,
      publicRuntimeId: "runtime_abcdefghijklmnopqrstuvwxyz",
      walkInPolicy: "autoCreate", termsVersion: "v1"}};
  const projection = projectPublicEvent(source);
  for (const field of PRIVATE_EVENT_FIELDS) {
    assert.equal(field in projection, false, field);
  }
  assert.equal(projection.synthetic, true);
  assert.deepEqual(projection.eventOrigin, {mode: "externalCompanion",
    bookingAuthority: "external", rosterAuthority: "hostImport",
    provider: "luma", externalEventId: null,
    externalEventUrl: "https://tickets.example.com/e/1",
    sourceExternalEventId: null, adapterVersion: null, connectedAt: null,
    connectedBy: null});
  assert.deepEqual(projection.runtimeAccess, {enabled: true,
    publicRuntimeId: null, walkInPolicy: "autoCreate", termsVersion: "v1"});
  assert.ok(validatePublic(projection),
    JSON.stringify(validatePublic.errors));
  assert.equal(validatePublic({...projection, genderCounts: {man: 1}}),
    false);
});

test("listing is always written; a missing listing reads as listed", () => {
  const unlisted = eventDoc();
  delete unlisted.listing;
  assert.equal(projectPublicEvent(unlisted).listing, "listed");
  assert.equal(projectPublicEvent({...eventDoc(), listing: "link"}).listing,
    "link");
  assert.equal(projectPublicEvent({...eventDoc(), listing: "other"}).listing,
    "listed");
});

test("a price hidden until booking opens is left out with its policy " +
  "amounts", () => {
  const source = {...eventDoc(), priceInPaise: 50000,
    priceHiddenUntilBookingOpens: true, publicRegistrationEnabled: false,
    eventPolicy: {...(eventDoc().eventPolicy as Row), pricing: {
      basePriceInPaise: 50000,
      cohortAdjustmentsInPaise: {womenInterestedInMen: -10000},
      demandPricingRules: [{id: "r1"}]}}};
  assert.equal(publicEventPriceHidden(source), true);
  const hidden = projectPublicEvent(source);
  assert.equal("priceInPaise" in hidden, false);
  assert.deepEqual((hidden.eventPolicy as Row).pricing, {
    basePriceInPaise: 0, cohortAdjustmentsInPaise: {womenInterestedInMen: 0},
    demandPricingRules: []});
  assert.equal(JSON.stringify(hidden).includes("50000"), false);
  assert.equal(JSON.stringify(hidden).includes("10000"), false);
  assert.ok(validatePublic(hidden), JSON.stringify(validatePublic.errors));

  const opened = projectPublicEvent({...source,
    publicRegistrationEnabled: true});
  assert.equal(opened.priceInPaise, 50000);
  assert.equal(((opened.eventPolicy as Row).pricing as Row).basePriceInPaise,
    50000);
});

test("a hidden guest list leaves out the checked-in and waitlisted counts",
  () => {
    const shown = projectPublicEvent({...eventDoc(), checkedInCount: 3,
      waitlistedCount: 2});
    assert.equal(shown.checkedInCount, 3);
    assert.equal(shown.waitlistedCount, 2);
    const hidden = projectPublicEvent({...eventDoc(), checkedInCount: 3,
      waitlistedCount: 2, showGuestList: false});
    assert.equal("checkedInCount" in hidden, false);
    assert.equal("waitlistedCount" in hidden, false);
    // Places left (capacity minus booked) stays public in every client.
    assert.equal(hidden.bookedCount, eventDoc().bookedCount);
    assert.ok(validatePublic(hidden), JSON.stringify(validatePublic.errors));
  });

test("reconcile writes, skips unchanged and removes unpublished copies",
  async () => {
    const store = new FakeStore();
    store.rows.set("events/e1", eventDoc());
    assert.equal(await reconcilePublicEvent("e1", deps(store)), "written");
    assert.equal(store.rows.get("publicEvents/e1")?.genderCounts, undefined);
    assert.equal(await reconcilePublicEvent("e1", deps(store)), "unchanged");

    store.rows.set("events/e1", {...eventDoc(), bookedCount: 5});
    assert.equal(await reconcilePublicEvent("e1", deps(store)), "written");
    assert.equal(store.rows.get("publicEvents/e1")?.bookedCount, 5);

    store.rows.set("events/e1", {...eventDoc(),
      publicationState: "private"});
    assert.equal(await reconcilePublicEvent("e1", deps(store)), "removed");
    assert.equal(store.rows.has("publicEvents/e1"), false);
    store.rows.delete("events/e1");
    assert.equal(await reconcilePublicEvent("e1", deps(store)), "absent");
    assert.equal(store.writes.some((write) => write.includes(" events/")),
      false);
  });

test("the backfill dry run writes nothing; apply copies, refreshes and " +
  "removes orphans", async () => {
  const store = new FakeStore();
  store.rows.set("events/a", eventDoc());
  store.rows.set("events/b", {...eventDoc(), publicationState: "private"});
  store.rows.set("publicEvents/gone", {name: "stale"});
  assert.deepEqual(await backfillPublicEvents(deps(store), false),
    {published: 1, notPublished: 1, orphanCopy: 1});
  assert.equal(store.writes.length, 0);
  assert.deepEqual(await backfillPublicEvents(deps(store), true),
    {written: 1, absent: 1, removed: 1});
  assert.equal(store.rows.has("publicEvents/a"), true);
  assert.equal(store.rows.has("publicEvents/gone"), false);
  assert.equal(store.writes.some((write) => write.includes(" events/")),
    false);
});
