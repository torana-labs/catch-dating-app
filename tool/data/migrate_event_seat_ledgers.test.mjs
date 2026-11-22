// Needs a current Functions build: the planner, ledger birth and migration
// engine are loaded from functions/lib, as the tool itself does.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  bookedCountSync,
  catchUidSeatKey,
  classifyEvent,
  describeUnfinished,
  eventLine,
  loadSeatLib,
  parseMigrateArgs,
  preclassifyEvent,
  runBackfill,
  runDiscards,
  seatReservationDocId,
} from "./migrate_event_seat_ledgers.mjs";

const requireFromFunctions = createFunctionsRequire();
const {Timestamp} = requireFromFunctions("firebase-admin/firestore");
const lib = loadSeatLib(requireFromFunctions);
const NOW = 1_800_000_000_000;

test("parseMigrateArgs collects repeated event and discard ids", () => {
  const args = parseMigrateArgs(["--env", "dev", "--event", "ev1",
    "--event=ev2", "--event", "ev1", "--json"]);
  assert.deepEqual(args.events, ["ev1", "ev2"]);
  assert.deepEqual(args.discard, []);
  assert.equal(args.env, "dev");
  assert.equal(args.apply, false);
  assert.equal(args.json, true);
  assert.equal(args.authEmulatorHost, null);

  const discard = parseMigrateArgs(["--project", "p", "--apply",
    "--allow-prod", "--discard", "ev3"]);
  assert.deepEqual(discard.discard, ["ev3"]);
  assert.equal(discard.apply, true);
  assert.equal(discard.allowProd, true);

  assert.equal(parseMigrateArgs(["--emulator"]).authEmulatorHost,
    "127.0.0.1:9099");
  assert.equal(parseMigrateArgs(["--emulator-host", "h:1",
    "--auth-emulator-host", "h:2"]).authEmulatorHost, "h:2");
});

test("parseMigrateArgs rejects bad ids, mixed modes and unknown flags", () => {
  for (const argv of [["--event"], ["--event", "--apply"], ["--event", "a/b"],
    ["--discard", ""], ["--event", "a", "--discard", "b"], ["--nope"],
    ["positional"], ["--auth-emulator-host", "h:2"]]) {
    assert.throws(() => parseMigrateArgs(argv), Error, JSON.stringify(argv));
  }
});

test("the CLI refuses prod apply without --allow-prod and needs a target",
  () => {
    const cli = fileURLToPath(new URL("./migrate_event_seat_ledgers.mjs",
      import.meta.url));
    const run = (args) => spawnSync(process.execPath, [cli, ...args],
      {encoding: "utf8", env: {...process.env, GCLOUD_PROJECT: "",
        GOOGLE_CLOUD_PROJECT: ""}});
    const prod = run(["--env", "prod", "--apply"]);
    assert.equal(prod.status, 1);
    assert.match(prod.stderr, /Refusing to move prod events/u);
    const untargeted = run([]);
    assert.equal(untargeted.status, 1);
    assert.match(untargeted.stderr, /Name the target/u);
    const help = run(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /cancelled-with-guests/u);
  });

test("preclassifyEvent sorts events before any source is read", () => {
  const pre = (event, authority = {}) => preclassifyEvent({event,
    ledger: null, fence: null, run: null, ...authority}, lib).class;
  assert.equal(pre(null), "missing");
  assert.equal(pre(activeEvent(), {ledger: {state: "ready"},
    fence: {state: "ready"}}), "on-ledger");
  assert.equal(pre(activeEvent(), {ledger: {state: "unreconciled"},
    fence: {state: "locked"}, run: {phase: "scan"}}), "unfinished-migration");
  assert.equal(pre(activeEvent(), {ledger: {state: "ready"}}),
    "unfinished-migration");
  assert.equal(pre({...activeEvent(), demoOps: true}), "demo");
  assert.equal(pre({...activeEvent(), synthetic: true}), "demo");
  assert.equal(pre({...activeEvent(), seedPrefix: "seed"}), "demo");
  assert.equal(pre({...activeEvent(), organizerId: undefined}), "malformed");
  assert.equal(pre({...activeEvent(), status: "draft"}), "malformed");
  assert.equal(pre({...activeEvent(), eventPolicy: {version: 2,
    admission: {capacityLimit: 9}}}), "malformed");
  assert.equal(pre(cancelledEvent()), "cancelled");
  assert.equal(pre(activeEvent()), "active");
  assert.equal(pre({...activeEvent(), capacityLimit: undefined}), "active");
});

test("describeUnfinished only offers discard for a backfill run before apply",
  () => {
    const base = {ledger: {state: "unreconciled"}, fence: {state: "locked"}};
    const run = {phase: "plan", outputCursor: 0, planHash: null,
      reviewedRequestHash: null};
    assert.equal(describeUnfinished({...base, run}).discardable, true);
    assert.equal(describeUnfinished({...base, run}).writersBlocked, true);
    assert.equal(describeUnfinished({...base,
      run: {...run, phase: "apply", planHash: "a"}}).discardable, false);
    const host = describeUnfinished({...base,
      run: {...run, reviewedRequestHash: "b".repeat(64)}});
    assert.equal(host.owner, "host");
    assert.equal(host.discardable, false);
    assert.equal(describeUnfinished({ledger: {state: "ready"}, fence: null,
      run: null}).owner, "none");
  });

test("classifyEvent splits cancelled and active events by their sources",
  () => {
    const cancelled = {class: "cancelled", organizerId: "org1"};
    assert.deepEqual(classifyEvent(cancelled, {activeBookings: 0,
      activeAttendees: 0, holds: null, bookedCount: 2}),
    {class: "cancelled-empty", organizerId: "org1",
      bookedCount: {from: 2, to: 0}});
    assert.equal(classifyEvent(cancelled, {activeBookings: 1,
      activeAttendees: 0, holds: null}).class, "cancelled-with-guests");
    assert.equal(classifyEvent(cancelled, {activeBookings: 0,
      activeAttendees: 0, holds: {source: "guestPayments"}}).class,
    "cancelled-with-guests");

    const active = {class: "active", organizerId: "org1"};
    const blocked = classifyEvent(active, {blockers: ["b", "a", "b"],
      detail: {eventBookedCount: 1}});
    assert.equal(blocked.class, "blocked");
    assert.deepEqual(blocked.blockers, ["a", "b"]);
    const ready = classifyEvent(active, {blockers: [], occupied: 3,
      bookedCount: 1, detail: {eventBookedCount: 1}});
    assert.equal(ready.class, "migratable");
    assert.deepEqual(ready.bookedCount, {from: 1, to: 3});
  });

test("bookedCountSync changes bookedCount only when it differs", () => {
  assert.equal(bookedCountSync({bookedCount: 4, occupied: 4}), null);
  assert.deepEqual(bookedCountSync({bookedCount: 1, occupied: 4}),
    {from: 1, to: 4});
  assert.deepEqual(bookedCountSync({bookedCount: undefined, occupied: 0}),
    {from: null, to: 0});
  assert.throws(() => bookedCountSync({bookedCount: 1, occupied: -1}));
  assert.throws(() => bookedCountSync({bookedCount: 1, occupied: null}));
});

test("the dry run reports every class and writes nothing", async () => {
  const db = new FakeFirestore(world());
  const report = await runBackfill({db, auth: fakeAuth(), lib,
    nowMillis: NOW});
  assert.equal(db.transactions, 0);
  assert.deepEqual(db.writes, []);
  const byId = Object.fromEntries(report.events.map((row) =>
    [row.eventId, row]));
  assert.equal(report.summary.classes["on-ledger"], 1);
  assert.equal(byId.demo.class, "demo");
  assert.equal(byId.demo.occupied, 1);
  assert.deepEqual(byId.demo.bookedCount, {from: 3, to: 1});
  assert.equal(byId.demo.seated, undefined);
  assert.equal(byId.demohost.class, "demo-blocked");
  assert.match(eventLine(byId.demo), /occupied 1/u);
  assert.equal(byId.broken.class, "malformed");
  assert.equal(byId.over.class, "cancelled-empty");
  assert.equal(byId.crowd.class, "cancelled-with-guests");
  assert.equal(byId.crowd.activeBookings, 1);
  assert.equal(byId.live.class, "migratable");
  assert.equal(byId.live.occupied, 2);
  assert.deepEqual(byId.live.bookedCount, {from: 1, to: 2});
  assert.equal(byId.drift.class, "blocked");
  assert.deepEqual(byId.drift.blockers, ["catchCountMismatch"]);
  assert.equal(byId.ghost.class, "blocked");
  assert.ok(byId.ghost.blockers.includes("authUserMissing"));
  assert.equal(byId.ghost.missingAuthUsersWithSeats, 1);
  assert.equal(byId.gone.class, "blocked");
  assert.deepEqual(byId.gone.blockers,
    ["authUserMissing", "verifiedUidEvidenceUnavailable"]);
  assert.equal(byId.gone.missingAuthUsers, 1);
  assert.equal(byId.gone.missingAuthUsersWithSeats, 0);
  assert.match(eventLine(byId.gone), /1 booking UID\(s\) have no Auth user, 0 of them holding a seat/u);
  assert.equal(byId.vanished.class, "active-empty");
  assert.ok(byId.vanished.engineBlockers.includes("authUserMissing"));
  assert.ok(byId.vanished.engineBlockers.includes("catchCountMismatch"));
  assert.deepEqual(byId.vanished.bookedCount, {from: 1, to: 0});
  assert.match(eventLine(byId.vanished), /nobody holds a seat/u);
  assert.equal(byId.held.class, "blocked");
  assert.deepEqual(byId.held.blockers, ["outstandingHolds:guestPayments"]);
  assert.match(eventLine(byId.drift),
    /catchCountMismatch \| bookedCount 0, active Catch bookings 1/u);
});

test("--event limits the run and reports unknown ids as missing", async () => {
  const db = new FakeFirestore(world());
  const report = await runBackfill({db, auth: fakeAuth(), lib,
    eventIds: ["live", "nope"], nowMillis: NOW});
  assert.deepEqual(report.events.map((row) => [row.eventId, row.class]),
    [["live", "migratable"], ["nope", "missing"]]);
});

test("apply moves migratable and empty cancelled events onto the ledger",
  async () => {
    const db = new FakeFirestore(world());
    const report = await runBackfill({db, auth: fakeAuth(), lib,
      apply: true, nowMillis: NOW});
    assert.equal(report.failures, 0);
    const byId = Object.fromEntries(report.events.map((row) =>
      [row.eventId, row]));

    assert.equal(byId.live.result, "migrated");
    assert.equal(byId.live.occupied, 2);
    assert.deepEqual(byId.live.bookedCount, {from: 1, to: 2});
    assert.equal(db.doc("eventSeatLedgers/live").state, "ready");
    assert.equal(db.doc("eventSeatLedgers/live").occupied, 2);
    assert.equal(db.doc("eventSeatMigrationFences/live").state, "ready");
    assert.equal(db.doc("eventSeatMigrationRuns/live").phase, "complete");
    assert.equal(db.doc("events/live").bookedCount, 2);
    assert.equal(db.paths("eventSeatMigrationStages/").length, 0);
    assert.equal(db.paths("eventSeatReservations/").filter((path) =>
      db.doc(path).eventId === "live").length, 2);

    assert.equal(byId.vanished.result, "created");
    assert.equal(db.doc("eventSeatLedgers/vanished").occupied, 0);
    assert.equal(db.doc("eventSeatMigrationFences/vanished").state, "ready");
    assert.equal(db.doc("events/vanished").bookedCount, 0);

    assert.equal(byId.over.result, "created");
    const ledger = db.doc("eventSeatLedgers/over");
    const expected = lib.newEventSeatLedger("over", db.doc("events/over"));
    assert.deepEqual(ledger, expected.ledger);
    assert.equal(db.doc("eventSeatMigrationFences/over").state, "ready");
    assert.equal(db.doc("eventSeatMigrationFences/over").organizerId, "org1");

    assert.equal(byId.demo.result, "created");
    assert.equal(db.doc("eventSeatLedgers/demo").occupied, 1);
    assert.equal(db.doc("eventSeatMigrationFences/demo").state, "ready");
    assert.equal(db.doc("events/demo").bookedCount, 1);
    const key = catchUidSeatKey("demo", "cast1");
    assert.equal(db.doc(`eventSeatReservations/${seatReservationDocId("demo",
      key)}`).active, true);
    assert.equal(db.doc(`eventSeatVerifiedPhones/${
      lib.seatVerifiedPhoneProofId("demo", "cast1")}`).phoneE164,
    "+919800000077");
    assert.equal(db.doc(`eventSeatIdentityAliases/${
      lib.seatIdentityAliasId("demo", "uid", "cast1")}`).canonicalKey, key);
    assert.equal(db.doc(`eventSeatIdentityAliases/${
      lib.seatIdentityAliasId("demo", "phone", "+919800000077")}`)
      .canonicalKey, key);

    for (const id of ["demohost", "broken", "crowd", "drift", "ghost", "gone",
      "held"]) {
      assert.equal(byId[id].result, undefined, id);
      assert.equal(db.doc(`eventSeatLedgers/${id}`), undefined, id);
    }
    // Nothing is deleted outside --discard, and sources are untouched.
    assert.deepEqual(db.writes.filter((write) => write.kind === "delete" &&
      !write.path.startsWith("eventSeatMigrationStages/") &&
      !write.path.startsWith("eventSeatMigrationPlans/")), []);
    assert.equal(db.doc("eventBookings/live_runner1").status, "signedUp");

    const again = await runBackfill({db, auth: fakeAuth(), lib,
      nowMillis: NOW + 1});
    assert.equal(again.summary.classes["on-ledger"], 5);
    assert.equal(again.summary.classes.migratable, 0);
    assert.equal(again.summary.classes["cancelled-empty"], 0);
  });

test("a failed engine run is reported as locked and --discard releases it",
  async () => {
    const db = new FakeFirestore(world());
    // Auth answers the rehearsal, then loses the user before the engine's
    // plan transaction, which leaves the scan's lock in place.
    let calls = 0;
    const auth = {getUser: async (uid) => {
      calls++;
      if (calls > 1) throw Object.assign(new Error("gone"),
        {code: "auth/user-not-found"});
      return {uid, phoneNumber: "+919800000001"};
    }};
    const report = await runBackfill({db, auth, lib, apply: true,
      eventIds: ["live"], nowMillis: NOW});
    const [row] = report.events;
    assert.equal(report.failures, 1);
    assert.equal(row.result, "failed");
    assert.equal(row.bookedCount, null);
    assert.equal(row.leftover.phase, "plan");
    assert.equal(row.leftover.writersBlocked, true);
    assert.equal(row.leftover.discardable, true);
    assert.match(eventLine(row), /LEFT LOCKED at phase plan/u);
    assert.match(eventLine(row), /--discard live --apply/u);
    assert.equal(db.doc("eventSeatMigrationFences/live").state, "locked");

    const preview = await runDiscards({db, auth, lib, eventIds: ["live"]});
    assert.equal(preview.events[0].result, "would-discard");
    assert.equal(db.doc("eventSeatMigrationFences/live").state, "locked");

    const released = await runDiscards({db, auth, lib, eventIds: ["live"],
      apply: true});
    assert.equal(released.events[0].result, "discarded");
    for (const path of ["eventSeatLedgers/live",
      "eventSeatMigrationFences/live", "eventSeatMigrationRuns/live"]) {
      assert.equal(db.doc(path), undefined, path);
    }
    assert.equal(db.paths("eventSeatMigrationStages/").length, 0);
    assert.equal(db.doc("events/live").bookedCount, 1);
  });

test("--discard refuses runs it does not own or that began activation",
  async () => {
    const db = new FakeFirestore({
      ...world(),
      "eventSeatLedgers/drift": {eventId: "drift", state: "unreconciled"},
      "eventSeatMigrationFences/drift": {eventId: "drift", state: "locked"},
      "eventSeatMigrationRuns/drift": {eventId: "drift", phase: "scan",
        outputCursor: 0, planHash: null,
        reviewedRequestHash: "c".repeat(64)},
    });
    const report = await runDiscards({db, auth: fakeAuth(), lib,
      eventIds: ["drift", "live"], apply: true});
    assert.deepEqual(report.events.map((row) => row.result),
      ["not-discardable", "no-run"]);
    assert.equal(db.doc("eventSeatMigrationRuns/drift").phase, "scan");
    const backfill = await runBackfill({db, auth: fakeAuth(), lib,
      apply: true, eventIds: ["drift"], nowMillis: NOW});
    assert.equal(backfill.events[0].class, "unfinished-migration");
    assert.equal(backfill.events[0].owner, "host");
    assert.equal(backfill.events[0].result, undefined);
  });

// ---------------------------------------------------------------------------
// Fixtures: fictional events, one organizer.

function activeEvent(extra = {}) {
  return {organizerId: "org1", name: "Sunrise Loop",
    startTime: Timestamp.fromMillis(100000), status: "active",
    publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false, eventCityId: "city1",
    eventMarketId: "market1", eventLocalDate: "2026-10-21",
    eventLocalStartTime: "18:00", eventTimezone: "Asia/Kolkata",
    setupDefaults: {city: {value: {cityId: "city1", marketId: "market1"},
      source: "event"}, timezone: {value: "Asia/Kolkata", source: "event"},
    organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)},
    capacityLimit: 20, bookedCount: 0, checkedInCount: 0,
    waitlistedCount: 0, cancelledAt: null, cancellationReason: null,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {},
    ...extra};
}

function cancelledEvent(extra = {}) {
  return activeEvent({status: "cancelled",
    cancelledAt: Timestamp.fromMillis(200000), cancellationReason: "Rain",
    ...extra});
}

function booking(eventId, uid, status = "signedUp") {
  return {[`eventBookings/${eventId}_${uid}`]: {eventId, organizerId: "org1",
    uid, status}};
}

function world() {
  const onLedger = activeEvent();
  const born = lib.newEventSeatLedger("done", onLedger);
  return {
    "events/done": onLedger,
    "eventSeatLedgers/done": born.ledger,
    "eventSeatMigrationFences/done": born.fence,
    // A demo event: a synthetic guest with no Auth user, booked once.
    "events/demo": activeEvent({demoOps: true, bookedCount: 3}),
    ...booking("demo", "cast1"),
    "users/cast1": {phoneNumber: "+919800000077"},
    // A demo event with a Host-sourced guest cannot be seated faithfully.
    "events/demohost": activeEvent({demoOps: true}),
    "eventAttendees/demohost_row": {eventId: "demohost", organizerId: "org1",
      source: "hostImport", status: "registered"},
    "events/broken": activeEvent({organizerId: undefined}),
    "events/over": cancelledEvent({bookedCount: 0}),
    ...booking("over", "runner9", "cancelled"),
    "events/crowd": cancelledEvent({bookedCount: 1}),
    ...booking("crowd", "runner1"),
    // One Catch booking plus one host import: two occupied seats.
    "events/live": activeEvent({bookedCount: 1}),
    ...booking("live", "runner1"),
    "eventAttendees/live_import1": {eventId: "live", organizerId: "org1",
      source: "hostImport", status: "registered", linkedUid: null,
      phoneE164: "+919800000002", externalReference: "row-1",
      sourceRowId: "row-1"},
    "events/drift": activeEvent({bookedCount: 0}),
    ...booking("drift", "runner1"),
    "events/ghost": activeEvent({bookedCount: 1}),
    ...booking("ghost", "missing1"),
    // A guest who deleted their account keeps a deleted booking.
    "events/gone": activeEvent({bookedCount: 1}),
    ...booking("gone", "runner1"),
    ...booking("gone", "missing2", "deleted"),
    // Its only guest deleted their account: no seat, a stale bookedCount.
    "events/vanished": activeEvent({bookedCount: 1}),
    ...booking("vanished", "missing3", "deleted"),
    "events/held": activeEvent(),
    "guestPayments/pay1": {eventId: "held", purpose: "checkout",
      status: "pending"},
  };
}

function fakeAuth() {
  return {getUser: async (uid) => {
    if (uid.startsWith("missing")) {
      throw Object.assign(new Error("no user"), {code: "auth/user-not-found"});
    }
    return {uid, phoneNumber: "+919800000001"};
  }};
}

// A small in-memory Firestore: equality filters, document-id order,
// startAfter, limit, and transactions whose writes land after the callback.
class FakeFirestore {
  constructor(rows) {
    this.rows = new Map(Object.entries(rows)
      .filter(([, value]) => value !== undefined)
      .map(([path, value]) => [path, stripUndefined(value)]));
    this.writes = [];
    this.transactions = 0;
  }

  doc(path) {
    return this.rows.get(path);
  }

  paths(prefix) {
    return [...this.rows.keys()].filter((path) => path.startsWith(prefix));
  }

  collection(name) {
    return new FakeQuery(this, name);
  }

  async runTransaction(fn) {
    this.transactions++;
    const pending = [];
    const tx = {
      get: async (source) => {
        assert.equal(pending.length, 0, "reads must precede writes");
        return source.get();
      },
      create: (ref, value) => pending.push(() => {
        if (this.rows.has(ref.path)) throw new Error(`${ref.path} exists`);
        this.write("create", ref.path, value);
      }),
      set: (ref, value) => pending.push(() =>
        this.write("set", ref.path, value)),
      update: (ref, value) => pending.push(() => {
        if (!this.rows.has(ref.path)) throw new Error(`${ref.path} missing`);
        this.write("update", ref.path, {...this.rows.get(ref.path), ...value});
      }),
      delete: (ref) => pending.push(() => {
        this.rows.delete(ref.path);
        this.writes.push({kind: "delete", path: ref.path});
      }),
    };
    const result = await fn(tx);
    pending.forEach((write) => write());
    return result;
  }

  write(kind, path, value) {
    this.rows.set(path, clone(stripUndefined(value)));
    this.writes.push({kind, path});
  }
}

class FakeQuery {
  constructor(db, name, filters = [], after = null, max = Infinity) {
    Object.assign(this, {db, name, filters, after, max});
  }

  doc(id) {
    const path = `${this.name}/${id}`;
    const db = this.db;
    return {path, id, get: async () => snapshot(id, db.rows.get(path))};
  }

  where(field, op, value) {
    assert.equal(op, "==");
    return new FakeQuery(this.db, this.name, [...this.filters, [field, value]],
      this.after, this.max);
  }

  orderBy() {
    return this;
  }

  select() {
    return this;
  }

  startAfter(id) {
    return new FakeQuery(this.db, this.name, this.filters, id, this.max);
  }

  limit(max) {
    return new FakeQuery(this.db, this.name, this.filters, this.after, max);
  }

  async get() {
    const docs = [...this.db.rows.entries()]
      .filter(([path]) => path.startsWith(`${this.name}/`) &&
        path.split("/").length === 2)
      .filter(([, row]) => this.filters.every(([field, value]) =>
        row[field] === value))
      .map(([path, row]) => snapshot(path.split("/")[1], row))
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      .filter((doc) => this.after === null || doc.id > this.after)
      .slice(0, this.max);
    return {docs, size: docs.length, empty: docs.length === 0};
  }
}

function snapshot(id, value) {
  return {id, exists: value !== undefined,
    data: () => value === undefined ? undefined : clone(value)};
}

// Deep-copies plain data and keeps class instances such as Timestamp.
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value)
      .map(([key, field]) => [key, clone(field)]));
  }
  return value;
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value)
    .filter(([, field]) => field !== undefined));
}
