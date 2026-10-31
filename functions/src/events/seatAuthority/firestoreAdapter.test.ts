import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {applyFirestoreSeat, applyFirestoreSeatBatch,
  assertCurrentReadySeatSnapshot,
  prepareFirestoreSeat, prepareFirestoreSeatBatch,
  SeatIdentityAuthority} from "./firestoreAdapter";
import {SeatAuthorityError, SeatCommand, SeatLedger} from "./seatAuthority";
import {SeatBatchCommand} from "./seatBatch";

type Subject = {contactId: string; uid: string};
const event = () => ({organizerId: "org-1", status: "active",
  capacityLimit: 2,
  eventPolicy: {version: 2, admission: {capacityLimit: 2}}});
const ledger = (): SeatLedger => ({eventId: "event-1", capacity: 2,
  occupied: 0, revision: 1, capacityRevision: 100,
  policyVersion: "v2",
  policyHash: "0d9299cd008e8ca01fb1070205278ada1" +
    "788be8a6b71d6bbd8b4760fff94a023", migrationRevision: 1, state: "ready"});
const command = (): SeatCommand<Subject> => ({eventId: "event-1",
  subject: {contactId: "contact-1", uid: "uid-1"},
  operation: "reserve", requestId: "request-1",
  expectedLedgerRevision: 1, expectedCapacityRevision: 100,
  expectedMigrationRevision: 1, expectedReservationRevision: 0,
  nowMillis: 1000});

class FakeStore {
  docs = new Map<string, unknown>([
    ["events/event-1", event()],
    ["eventSeatLedgers/event-1", ledger()],
    ["organizerContacts/contact-1", {organizerId: "org-1",
      identityState: "verified", linkedUid: "uid-1", revision: 3,
      deletedAt: null, mergedIntoContactId: null}],
  ]);
  reads: string[] = [];
  writes: Array<{kind: string; path: string}> = [];
  timeline: string[] = [];
  db = {collection: (name: string) => ({doc: (id: string) =>
    ({path: `${name}/${id}`})})} as unknown as FirebaseFirestore.Firestore;
  tx = {
    get: async (ref: {path: string}) => {
      this.reads.push(ref.path);
      this.timeline.push(`read:${ref.path}`);
      const data = this.docs.get(ref.path);
      return {exists: data !== undefined, data: () => data};
    },
    set: (ref: {path: string}) => {
      this.writes.push({kind: "set", path: ref.path});
      this.timeline.push(`write:${ref.path}`);
    },
    create: (ref: {path: string}) => {
      this.writes.push({kind: "create", path: ref.path});
      this.timeline.push(`write:${ref.path}`);
    },
  } as unknown as FirebaseFirestore.Transaction;
}
const authority: SeatIdentityAuthority<Subject> = {
  resolve: async ({db, tx, organizerId, subject}) => {
    const snap = await tx.get(db.collection("organizerContacts")
      .doc(subject.contactId));
    const contact = snap.data() as Record<string, unknown> | undefined;
    if (!contact || contact.organizerId !== organizerId ||
        contact.identityState !== "verified" ||
        contact.linkedUid !== subject.uid ||
        contact.deletedAt !== null ||
        contact.mergedIntoContactId !== null) return null;
    return {key: `contact-${subject.contactId}`,
      revision: contact.revision as number};
  },
};
function unavailable(phrase: string) {
  return (error: unknown) => error instanceof SeatAuthorityError &&
    error.code === "unavailable" && error.message.includes(phrase);
}

test("reads event, ledger and verified identity before deterministic writes",
  async () => {
    const store = new FakeStore();
    const prepared = await prepareFirestoreSeat({db: store.db,
      tx: store.tx, command: command(), identityAuthority: authority});
    assert.equal(prepared.eventCapacity, 2);
    assert.equal(prepared.eventPolicyVersion, "v2");
    assert.equal(prepared.eventCapacityRevision, 100);
    assert.equal(store.writes.length, 0);
    assert.ok(store.reads.includes("organizerContacts/contact-1"));
    assert.equal(applyFirestoreSeat(prepared).active, true);
    assert.deepEqual(store.writes.map((write) => write.kind),
      ["set", "set", "create"]);
    assert.equal(store.writes[0].path, "eventSeatLedgers/event-1");
    assert.match(store.writes[1].path,
      /^eventSeatReservations\/[a-f0-9]{64}$/u);
    assert.match(store.writes[2].path,
      /^eventSeatRequestReceipts\/[a-f0-9]{64}$/u);
  });

test("missing or ambiguous identity authority denies without writes",
  async () => {
    const missing = new FakeStore();
    await assert.rejects(prepareFirestoreSeat({db: missing.db,
      tx: missing.tx, command: command()}), unavailable("not installed"));
    const ambiguous = new FakeStore();
    ambiguous.docs.set("organizerContacts/contact-1", {
      organizerId: "org-1", identityState: "ambiguous",
      linkedUid: "uid-1", revision: 3, deletedAt: null,
      mergedIntoContactId: null});
    await assert.rejects(prepareFirestoreSeat({db: ambiguous.db,
      tx: ambiguous.tx, command: command(), identityAuthority: authority}),
    unavailable("unresolved"));
    assert.deepEqual(missing.writes, []);
    assert.deepEqual(ambiguous.writes, []);
  });

test("missing capacity, policy mismatch and migration lag deny",
  async () => {
    const changes = [
      (store: FakeStore) => store.docs.set("events/event-1",
        {...event(), organizerId: "foreign-organizer"}),
      (store: FakeStore) => store.docs.set("events/event-1",
        {...event(), capacityLimit: undefined}),
      (store: FakeStore) => store.docs.set("events/event-1",
        {...event(), eventPolicy: {version: 2,
          admission: {capacityLimit: 4}}}),
      (store: FakeStore) => store.docs.set("eventSeatLedgers/event-1",
        {...ledger(), policyHash: "f".repeat(64)}),
      (store: FakeStore) => store.docs.set("eventSeatLedgers/event-1",
        {...ledger(), state: "unreconciled"}),
      (store: FakeStore) => store.docs.set("events/event-1",
        {...event(), eventPolicy: {version: 2,
          admission: {capacityLimit: 2, manualApprovalRequired: true}}}),
      (store: FakeStore) => store.docs.set("events/event-1",
        {...event(), eventPolicy: {version: "2",
          admission: {capacityLimit: 2}}}),
    ];
    for (const change of changes) {
      const store = new FakeStore();
      change(store);
      await assert.rejects(prepareFirestoreSeat({db: store.db,
        tx: store.tx, command: command(), identityAuthority: authority}),
      unavailable(""));
      assert.deepEqual(store.writes, []);
    }
  });

test("cancelled event blocks reserve", async () => {
  const store = new FakeStore();
  store.docs.set("events/event-1", {...event(), status: "cancelled"});
  await assert.rejects(prepareFirestoreSeat({db: store.db,
    tx: store.tx, command: command(), identityAuthority: authority}),
  unavailable("not open"));
  assert.deepEqual(store.writes, []);
});


test("bookedCount-only event update keeps reconciled policy authority",
  async () => {
    const store = new FakeStore();
    store.docs.set("events/event-1", {...event(), bookedCount: 1});
    const prepared = await prepareFirestoreSeat({db: store.db,
      tx: store.tx, command: command(), identityAuthority: authority});
    assert.equal(prepared.eventPolicyHash, ledger().policyHash);
    assert.equal(store.writes.length, 0);
  });

const batchCommand = (): SeatBatchCommand<Subject> => ({
  eventId: "event-1", batchId: "transfer-1",
  expectedLedgerRevision: 1, expectedCapacityRevision: 100,
  expectedMigrationRevision: 1, nowMillis: 2000,
  operations: [
    {subject: {contactId: "contact-1", uid: "uid-1"},
      operation: "release", requestId: "cancel-1",
      expectedReservationRevision: 1},
    {subject: {contactId: "contact-2", uid: "uid-2"},
      operation: "reserve", requestId: "promote-1",
      expectedReservationRevision: 0},
  ],
});
const seatPath = (key: string) => "eventSeatReservations/" +
  createHash("sha256").update(`event-1\u001f${key}`).digest("hex");
function batchStore(): FakeStore {
  const store = new FakeStore();
  store.docs.set("eventSeatLedgers/event-1", {...ledger(), occupied: 1});
  store.docs.set(seatPath("contact-contact-1"), {
    eventId: "event-1", canonicalKey: "contact-contact-1",
    identityRevision: 3, active: true, revision: 1,
    reservedAtMillis: 1000, releasedAtMillis: null,
  });
  store.docs.set("organizerContacts/contact-2", {organizerId: "org-1",
    identityState: "verified", linkedUid: "uid-2", revision: 1,
    deletedAt: null, mergedIntoContactId: null});
  return store;
}

test("batch adapter reads one ledger and both identities before writes",
  async () => {
    const store = batchStore();
    const prepared = await prepareFirestoreSeatBatch({db: store.db,
      tx: store.tx, command: batchCommand(), identityAuthority: authority});
    assert.equal(store.writes.length, 0);
    assert.equal(store.reads.filter((path) =>
      path === "eventSeatLedgers/event-1").length, 1);
    assert.ok(store.reads.includes("organizerContacts/contact-1"));
    assert.ok(store.reads.includes("organizerContacts/contact-2"));
    const result = applyFirestoreSeatBatch(prepared);
    assert.equal(result.occupied, 1);
    assert.equal(result.replayed, false);
    assert.deepEqual(store.writes.map((write) => write.kind),
      ["set", "set", "set", "create", "create"]);
    const firstWrite = store.timeline.findIndex((entry) =>
      entry.startsWith("write:"));
    assert.equal(store.timeline.slice(firstWrite).some((entry) =>
      entry.startsWith("read:")), false);
  });

test("batch adapter rejects changed policy or unresolved identity",
  async () => {
    const changed = batchStore();
    changed.docs.set("eventSeatLedgers/event-1", {...ledger(),
      occupied: 1, policyHash: "f".repeat(64)});
    await assert.rejects(prepareFirestoreSeatBatch({db: changed.db,
      tx: changed.tx, command: batchCommand(), identityAuthority: authority}),
    unavailable("policy reconciliation"));
    assert.deepEqual(changed.writes, []);
    const ambiguous = batchStore();
    ambiguous.docs.set("organizerContacts/contact-2", {
      organizerId: "org-1", identityState: "ambiguous",
      linkedUid: "uid-2", revision: 1, deletedAt: null,
      mergedIntoContactId: null});
    await assert.rejects(prepareFirestoreSeatBatch({db: ambiguous.db,
      tx: ambiguous.tx, command: batchCommand(), identityAuthority: authority}),
    unavailable("unresolved"));
    assert.deepEqual(ambiguous.writes, []);
  });

function retainedSnapshot() {
  return {event: event(), eventId: "event-1", organizerId: "org-1",
    identity: {key: "contact-contact-1", revision: 3},
    ledger: {...ledger(), occupied: 1},
    reservation: {eventId: "event-1", canonicalKey: "contact-contact-1",
      identityRevision: 3, active: true, revision: 1,
      reservedAtMillis: 1000, releasedAtMillis: null as number | null},
    expectedActive: true};
}

test("retained seats validate without occupancy changes or fabricated receipts",
  () => {
    const snapshot = retainedSnapshot();
    const before = JSON.stringify(snapshot);
    assertCurrentReadySeatSnapshot(snapshot);
    assert.equal(JSON.stringify(snapshot), before);
    // Cancellation preserves a valid reservation for history/cleanup;
    // permission to check in or admit remains the caller's business rule.
    assertCurrentReadySeatSnapshot({...snapshot,
      event: {...snapshot.event, status: "cancelled"}});
    assertCurrentReadySeatSnapshot({...snapshot,
      ledger: {...snapshot.ledger, occupied: 0},
      reservation: {...snapshot.reservation, active: false,
        releasedAtMillis: 2000}, expectedActive: false});
    assertCurrentReadySeatSnapshot({...snapshot,
      ledger: {...snapshot.ledger, occupied: 0},
      reservation: null, expectedActive: false});
  });

test("retained seat checks reject corrupt lineage, stale policy and identity",
  () => {
    const base = retainedSnapshot();
    const changes = [
      {...base, organizerId: "foreign"},
      {...base, identity: {...base.identity, revision: 4}},
      {...base, identity: {...base.identity, revision: 0}},
      {...base, expectedActive: false},
      {...base, reservation: null},
      ...[
        {eventId: "foreign"}, {occupied: 0}, {occupied: 3},
        {occupied: -1}, {revision: Number.MAX_SAFE_INTEGER},
        {revision: NaN}, {revision: 0},
        {capacityRevision: 0}, {migrationRevision: 0},
        {policyHash: "f".repeat(64)}, {capacity: 3},
      ].map((patch) => ({...base, ledger: {...base.ledger, ...patch}})),
      ...[
        {eventId: "foreign"}, {canonicalKey: "wrong"},
        {identityRevision: 4}, {revision: 0},
        {revision: Number.MAX_SAFE_INTEGER}, {reservedAtMillis: -1},
        {releasedAtMillis: 2000}, {active: false},
      ].map((patch) => ({...base,
        reservation: {...base.reservation, ...patch}})),
      {...base, event: {...event(), eventPolicy: {version: 2,
        admission: {capacityLimit: 2, manualApprovalRequired: true}}}},
    ];
    for (const snapshot of changes) {
      assert.throws(() => assertCurrentReadySeatSnapshot(snapshot),
        unavailable(""));
    }
  });
