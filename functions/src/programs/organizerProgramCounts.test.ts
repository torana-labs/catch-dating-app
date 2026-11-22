import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import {contractValidator} from "../shared/contractTestValidators";
import {
  applyOrganizerProgramCountWrite,
  countDelta,
  countedProgramIds,
  recountAllOrganizerPrograms,
  recountOrganizerProgram,
  rfc3339Micros,
} from "./organizerProgramCounts";
import {reconcileOrganizerProgramView} from "./organizerProgramViews";

const validate = contractValidator("OrganizerProgramViewDocument");

const guest = (overrides: FakeData = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", rsvpStatus: "pending",
  anonymizedAt: null, displayName: "Asha", ...overrides});
const leg = (overrides: FakeData = {}): FakeData => ({
  programId: "program-1", organizerId: "org-1", kind: "inbound",
  readiness: "expected", ...overrides});

const guests = (before: FakeData | undefined, after: FakeData | undefined,
  programId = "program-1", organizerId = "org-1") =>
  countDelta("guests", before, after, programId, organizerId);
const legs = (before: FakeData | undefined, after: FakeData | undefined,
  programId = "program-1", organizerId = "org-1") =>
  countDelta("travelLegs", before, after, programId, organizerId);

const delta = (guestCount: number, repliedGuestCount: number,
  flyingInCount = 0) => ({guestCount, repliedGuestCount, flyingInCount});

test("guest writes move the guest and replied counts", () => {
  assert.deepEqual(guests(undefined, guest()), delta(1, 0), "invited");
  assert.deepEqual(guests(undefined, guest({rsvpStatus: "accepted"})),
    delta(1, 1), "invited having replied");
  assert.deepEqual(guests(guest({rsvpStatus: "declined"}), undefined),
    delta(-1, -1), "a replied guest removed");
  assert.deepEqual(guests(guest(), undefined), delta(-1, 0),
    "a pending guest removed");
  assert.deepEqual(guests(guest({rsvpStatus: "accepted"}),
    guest({rsvpStatus: "accepted", anonymizedAt: Timestamp.fromMillis(9)})),
  delta(-1, -1), "anonymized");
  assert.deepEqual(guests(guest(), guest({rsvpStatus: "accepted"})),
    delta(0, 1), "an RSVP leaving pending");
  assert.deepEqual(guests(guest({rsvpStatus: "maybe"}), guest()),
    delta(0, -1), "an RSVP back to pending");
  assert.deepEqual(guests(guest({rsvpStatus: "accepted"}),
    guest({rsvpStatus: "declined"})), delta(0, 0), "one reply for another");
  assert.deepEqual(guests(guest(), guest({displayName: "Asha R"})),
    delta(0, 0), "a name edit");
  assert.deepEqual(guests(undefined, guest({rsvpStatus: undefined})),
    delta(1, 0), "no RSVP counts as not replied");
  assert.deepEqual(guests(undefined, guest({organizerId: "org-2"})),
    delta(0, 0), "another organizer's guest");
  assert.deepEqual(guests(guest({anonymizedAt: Timestamp.fromMillis(9)}),
    undefined), delta(0, 0), "an anonymized guest removed");
  const moved = [guest({rsvpStatus: "accepted"}),
    guest({programId: "program-2", rsvpStatus: "accepted"})] as const;
  assert.deepEqual(guests(...moved, "program-1"), delta(-1, -1),
    "the programme it left");
  assert.deepEqual(guests(...moved, "program-2"), delta(1, 1),
    "the programme it joined");
  assert.deepEqual(countedProgramIds(...moved), ["program-1", "program-2"]);
});

test("journey writes move the flying-in count", () => {
  assert.deepEqual(legs(undefined, leg()), delta(0, 0, 1), "inbound added");
  assert.deepEqual(legs(undefined, leg({kind: "outbound"})), delta(0, 0, 0),
    "outbound added");
  assert.deepEqual(legs(leg(), leg({readiness: "noShow"})), delta(0, 0, -1),
    "entering no-show");
  assert.deepEqual(legs(leg({readiness: "noShow"}), leg({readiness: "ready"})),
    delta(0, 0, 1), "leaving no-show");
  assert.deepEqual(legs(leg(), leg({readiness: "ready"})), delta(0, 0, 0),
    "another readiness");
  assert.deepEqual(legs(leg(), undefined), delta(0, 0, -1), "inbound removed");
  assert.deepEqual(legs(leg({readiness: "noShow"}), undefined),
    delta(0, 0, 0), "a no-show removed");
  assert.deepEqual(legs(leg({kind: "outbound"}), leg()), delta(0, 0, 1),
    "turned inbound");
  const moved = [leg(), leg({programId: "program-2"})] as const;
  assert.deepEqual(legs(...moved, "program-1"), delta(0, 0, -1));
  assert.deepEqual(legs(...moved, "program-2"), delta(0, 0, 1));
});

test("write times keep their microseconds", () => {
  assert.equal(rfc3339Micros("2026-11-22T10:00:00.123456Z"),
    Date.parse("2026-11-22T10:00:00Z") * 1000 + 123456);
  assert.equal(rfc3339Micros("2026-11-22T10:00:00.1Z"),
    Date.parse("2026-11-22T10:00:00Z") * 1000 + 100000);
  assert.equal(rfc3339Micros("2026-11-22T10:00:00.123456789Z"),
    Date.parse("2026-11-22T10:00:00Z") * 1000 + 123456);
  assert.equal(rfc3339Micros("2026-11-22T15:30:00+05:30"),
    Date.parse("2026-11-22T10:00:00Z") * 1000);
  assert.equal(rfc3339Micros("yesterday"), null);
});

const fence = rfc3339Micros("2026-11-22T10:00:00.000000Z")!;
const later = "2026-11-22T10:00:01.000001Z";
const earlier = "2026-11-22T09:59:59.999999Z";

const counted = (programId = "program-1", overrides: FakeData = {}) => ({
  programId, organizerId: "org-1", guestCount: 4, repliedGuestCount: 2,
  flyingInCount: 3, guestCountsAsOfMicros: fence,
  flyingInCountAsOfMicros: fence, ...overrides});

const countStore = (views: Record<string, FakeData>) => {
  const store = new FakeFirestore(Object.fromEntries(Object.entries(views)
    .map(([id, view]) => [`organizerProgramViews/${id}`, view])));
  return {store, db: store as unknown as FirebaseFirestore.Firestore};
};

const write = (db: FirebaseFirestore.Firestore, overrides: {
  source?: "guests" | "travelLegs"; eventId?: string; eventTime?: string;
  before?: FakeData; after?: FakeData}) =>
  applyOrganizerProgramCountWrite(db, {source: "guests", eventId: "event-1",
    eventTime: later, before: undefined, after: undefined,
    nowMillis: 1_800_000_000_000, ...overrides});

test("a write after the fence moves the counts once", async () => {
  const {store, db} = countStore({"program-1": counted()});
  assert.equal(await write(db, {after: guest({rsvpStatus: "accepted"})}),
    "applied");
  const view = store.getDoc("organizerProgramViews/program-1")!;
  assert.equal(view.guestCount, 5);
  assert.equal(view.repliedGuestCount, 3);
  assert.equal(view.flyingInCount, 3);
  assert.ok(store.getDoc("commandReceipts/organizerProgramCounts_event-1"));

  // The platform delivers the same event again.
  assert.equal(await write(db, {after: guest({rsvpStatus: "accepted"})}),
    "replayed");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    5);

  assert.equal(await write(db, {source: "travelLegs", eventId: "event-2",
    before: leg(), after: leg({readiness: "noShow"})}), "applied");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!
    .flyingInCount, 2);
});

test("a write the recount already saw changes nothing", async () => {
  const {store, db} = countStore({"program-1": counted()});
  assert.equal(await write(db, {eventTime: earlier, after: guest()}),
    "skipped");
  assert.equal(await write(db, {eventId: "event-2",
    eventTime: "2026-11-22T10:00:00Z", after: guest()}), "skipped",
  "a write at the fence instant");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    4);
  assert.equal(store.getDoc("commandReceipts/organizerProgramCounts_event-1"),
    undefined);
});

test("a view with no counts yet, or no view, is left alone", async () => {
  const {store, db} = countStore({"program-1": {programId: "program-1",
    organizerId: "org-1"}});
  assert.equal(await write(db, {after: guest()}), "skipped");
  assert.equal("guestCount" in store.getDoc(
    "organizerProgramViews/program-1")!, false);
  assert.equal(await write(db, {eventId: "event-2",
    after: guest({programId: "program-9"})}), "skipped");
});

test("a write that moves no count opens no transaction", async () => {
  const {store, db} = countStore({"program-1": counted()});
  assert.equal(await write(db, {before: guest(),
    after: guest({displayName: "Asha R"})}), "unchanged");
  assert.equal(await write(db, {source: "travelLegs", before: leg(),
    after: leg({readiness: "ready"})}), "unchanged");
  assert.equal(store.transactionCommits, 0);
});

test("a move between programmes moves both in one transaction", async () => {
  const {store, db} = countStore({"program-1": counted(),
    "program-2": counted("program-2", {guestCount: 0, repliedGuestCount: 0,
      guestCountsAsOfMicros: rfc3339Micros(later)! + 1})});
  assert.equal(await write(db, {before: guest({rsvpStatus: "accepted"}),
    after: guest({programId: "program-2", rsvpStatus: "accepted"})}),
  "applied");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    3);
  assert.equal(store.getDoc("organizerProgramViews/program-1")!
    .repliedGuestCount, 1);
  // Program 2 was recounted after this write, so its counts include it.
  assert.equal(store.getDoc("organizerProgramViews/program-2")!.guestCount,
    0);
  assert.equal(store.transactionCommits, 1);
});

const recountSeed = (): Record<string, FakeData> => ({
  "organizerProgramViews/program-1": {programId: "program-1",
    organizerId: "org-1", title: "Sharma–Rao Wedding"},
  "programGuests/g1": guest({rsvpStatus: "accepted"}),
  "programGuests/g2": guest(),
  "programGuests/g3": guest({rsvpStatus: "declined"}),
  "programGuests/g4": guest({rsvpStatus: "accepted",
    anonymizedAt: Timestamp.fromMillis(9)}),
  "programGuests/g5": guest({organizerId: "org-2"}),
  "programGuests/g6": guest({programId: "program-2"}),
  "programTravelLegs/l1": leg(),
  "programTravelLegs/l2": leg({readiness: "noShow"}),
  "programTravelLegs/l3": leg({kind: "outbound"}),
  "programTravelLegs/l4": leg({readiness: "ready"}),
});

test("a recount sets the counts and their fences", async () => {
  const store = new FakeFirestore(recountSeed());
  const db = store as unknown as FirebaseFirestore.Firestore;
  const outcome = await recountOrganizerProgram(db, "program-1",
    {nowMicros: () => 42});
  assert.equal(outcome.kind, "written");
  const view = store.getDoc("organizerProgramViews/program-1")!;
  assert.deepEqual([view.guestCount, view.repliedGuestCount,
    view.flyingInCount], [3, 2, 2]);
  assert.equal(view.guestCountsAsOfMicros, 42);
  assert.equal(view.flyingInCountAsOfMicros, 42);
  assert.equal(view.title, "Sharma–Rao Wedding");

  // Counts that match are not written again.
  const commits = store.transactionCommits;
  assert.equal((await recountOrganizerProgram(db, "program-1")).kind,
    "current");
  assert.equal(store.transactionCommits, commits);
  assert.equal((await recountOrganizerProgram(db, "program-9")).kind,
    "noView");
});

test("a recount fences each source at its query's read time", async () => {
  const store = new FakeFirestore(recountSeed());
  const runQuery = store.runQuery.bind(store);
  store.runQuery = async (query) => Object.assign(await runQuery(query), {
    readTime: query.collectionPath === "programGuests" ?
      new Timestamp(1_800_000_000, 123_456_789) :
      new Timestamp(1_800_000_001, 5_000)});
  const db = store as unknown as FirebaseFirestore.Firestore;
  await recountOrganizerProgram(db, "program-1");
  const view = store.getDoc("organizerProgramViews/program-1")!;
  assert.equal(view.guestCountsAsOfMicros, 1_800_000_000_123_456);
  assert.equal(view.flyingInCountAsOfMicros, 1_800_000_001_000_005);
});

test("a recount repairs drift and reports it in a dry run", async () => {
  const seed = recountSeed();
  seed["organizerProgramViews/program-1"] = counted();
  const store = new FakeFirestore(seed);
  const db = store as unknown as FirebaseFirestore.Firestore;
  const dry = await recountOrganizerProgram(db, "program-1", {dryRun: true});
  assert.deepEqual(dry, {kind: "drift",
    before: {guestCount: 4, repliedGuestCount: 2, flyingInCount: 3},
    counts: {guestCount: 3, repliedGuestCount: 2, flyingInCount: 2}});
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    4);
  assert.equal((await recountOrganizerProgram(db, "program-1",
    {nowMicros: () => fence + 7})).kind, "written");
  const view = store.getDoc("organizerProgramViews/program-1")!;
  assert.equal(view.guestCount, 3);
  assert.equal(view.guestCountsAsOfMicros, fence + 7);
});

test("a recount never overwrites a delta applied while it read", async () => {
  const store = new FakeFirestore(recountSeed());
  const runQuery = store.runQuery.bind(store);
  let bumps = 1;
  store.runQuery = async (query) => {
    const result = await runQuery(query);
    if (query.collectionPath === "programGuests" && bumps-- > 0) {
      store.updateDoc("organizerProgramViews/program-1",
        {title: `Renamed ${bumps}`});
    }
    return result;
  };
  const db = store as unknown as FirebaseFirestore.Firestore;
  assert.equal((await recountOrganizerProgram(db, "program-1")).kind,
    "written", "the second attempt commits");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.title,
    "Renamed 0");

  bumps = 99;
  store.updateDoc("organizerProgramViews/program-1", {guestCount: 9});
  assert.equal((await recountOrganizerProgram(db, "program-1")).kind,
    "busy");
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    9);
});

test("the sweep recounts every view, page by page", async () => {
  const seed = recountSeed();
  for (let index = 0; index < 205; index++) {
    seed[`organizerProgramViews/p-${String(index).padStart(3, "0")}`] = {
      programId: `p-${index}`, organizerId: "org-1"};
  }
  const store = new FakeFirestore(seed);
  const db = store as unknown as FirebaseFirestore.Firestore;
  const dry = await recountAllOrganizerPrograms(db, {dryRun: true});
  assert.equal(dry.scanned, 206);
  assert.equal(dry.drift, 206);
  assert.equal(store.getDoc("organizerProgramViews/p-000")!.guestCount,
    undefined);
  const summary = await recountAllOrganizerPrograms(db);
  assert.equal(summary.written, 206);
  assert.equal(store.getDoc("organizerProgramViews/p-204")!.guestCount, 0);
  assert.equal(store.getDoc("organizerProgramViews/program-1")!.guestCount,
    3);
  const again = await recountAllOrganizerPrograms(db);
  assert.equal(again.current, 206);
  const stopped = await recountAllOrganizerPrograms(db,
    {deadlineMillis: 0, nowMillis: () => 1});
  assert.deepEqual([stopped.scanned, stopped.stoppedEarly], [0, true]);
});

test("a setup rewrite keeps the counts and asks for a first recount",
  async () => {
    const store = new FakeFirestore({...baseSeed()});
    const db = store as unknown as FirebaseFirestore.Firestore;
    assert.equal(await reconcileOrganizerProgramView(db, "program-1"), true,
      "a new view has no counts");
    assert.equal((await recountOrganizerProgram(db, "program-1")).kind,
      "written");
    const counts = store.getDoc("organizerProgramViews/program-1")!;
    assert.equal(counts.guestCount, 2);
    assert.equal(validate(counts), true, JSON.stringify(validate.errors));

    store.updateDoc("organizerPrograms/program-1", {title: "Renamed",
      revision: 4});
    assert.equal(await reconcileOrganizerProgramView(db, "program-1"), false);
    const view = store.getDoc("organizerProgramViews/program-1")!;
    assert.equal(view.title, "Renamed");
    for (const field of ["guestCount", "repliedGuestCount", "flyingInCount",
      "guestCountsAsOfMicros", "flyingInCountAsOfMicros"]) {
      assert.equal(view[field], counts[field], field);
    }
    assert.equal(validate(view), true, JSON.stringify(validate.errors));
  });
