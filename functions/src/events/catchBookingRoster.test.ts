import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  participationAfterPatch,
  readCatchBookingRoster,
  writeCatchBookingRoster,
} from "./catchBookingRoster";
import {eventAttendeeId} from "./eventAttendees";

type Row = Record<string, unknown>;

/** Minimal Firestore: document reads, equality queries, merged writes. */
function fakeDb(seed: Record<string, Row>) {
  const docs = new Map(Object.entries(seed));
  const doc = (path: string) => ({path, id: path.split("/").at(-1)!,
    kind: "doc" as const});
  const query = (collection: string, filters: Array<[string, unknown]> = [],
    max = Infinity) => ({kind: "query" as const, collection, filters, max,
    where: (field: string, _op: string, value: unknown) =>
      query(collection, [...filters, [field, value]], max),
    limit: (value: number) => query(collection, filters, value)});
  const db = {collection: (name: string) => ({
    doc: (id: string) => doc(`${name}/${id}`),
    where: (field: string, op: string, value: unknown) =>
      query(name).where(field, op, value),
  })};
  const writes: Array<{path: string; data: Row; merge: boolean}> = [];
  const tx = {
    get: async (ref: ReturnType<typeof doc> |
      ReturnType<typeof query>) => {
      if (ref.kind === "doc") {
        const data = docs.get(ref.path);
        return {exists: data !== undefined, data: () => data};
      }
      const rows = [...docs.entries()].filter(([path, data]) =>
        path.startsWith(`${ref.collection}/`) &&
        ref.filters.every(([field, value]) => data[field] === value))
        .slice(0, ref.max)
        .map(([path, data]) => ({id: path.split("/").at(-1)!, ref: doc(path),
          data: () => data}));
      return {docs: rows, size: rows.length};
    },
    set: (ref: ReturnType<typeof doc>, data: Row,
      options?: {merge?: boolean}) => {
      writes.push({path: ref.path, data, merge: options?.merge === true});
      docs.set(ref.path, options?.merge ?
        {...(docs.get(ref.path) ?? {}), ...data} : data);
    },
  };
  return {db: db as unknown as FirebaseFirestore.Firestore,
    tx: tx as unknown as FirebaseFirestore.Transaction, docs, writes};
}

const now = admin.firestore.Timestamp.fromMillis(1_000);
const booking = (overrides: Row = {}) => participationAfterPatch(undefined, {
  eventId: "e1", organizerId: "o1", uid: "u1", status: "signedUp",
  createdAt: now, signedUpAt: now, waitlistedAt: null, attendedAt: null,
  cancelledAt: null, deletedAt: null, genderAtSignup: null, paymentId: null,
  ...overrides,
});

test("a merge patch deletes fields marked for deletion", () => {
  const after = participationAfterPatch({status: "waitlisted",
    waitlistOfferId: "offer-1", paymentId: null}, {status: "signedUp",
    waitlistOfferId: admin.firestore.FieldValue.delete()});
  assert.equal(after.status, "signedUp");
  assert.equal("waitlistOfferId" in after, false);
  assert.equal(after.paymentId, null);
});

test("a first booking creates a uid-keyed row and its pointer", async () => {
  const h = fakeDb({"publicProfiles/u1": {name: " Asha "}});
  const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
    eventId: "e1", uid: "u1", verifiedPhone: async () => null});
  writeCatchBookingRoster({db: h.db, tx: h.tx, slot, booking: booking(), now});
  const rowId = eventAttendeeId("e1", "uid:u1");
  assert.equal(h.docs.get(`eventAttendees/${rowId}`)?.displayName, "Asha");
  assert.equal(h.docs.get(`eventAttendees/${rowId}`)?.status, "registered");
  assert.equal(h.docs.get("eventAttendeeIndex/e1_u1")?.attendeeId, rowId);
});

test("the pointer wins over every other key and is not rewritten",
  async () => {
    let phoneLoaded = false;
    const h = fakeDb({
      "eventAttendeeIndex/e1_u1": {attendeeId: "att_pointer"},
      "eventAttendees/att_pointer": {eventId: "e1", source: "catchBooking",
        linkedUid: "u1", status: "registered", partySize: 2},
    });
    const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
      eventId: "e1", uid: "u1", verifiedPhone: async () => {
        phoneLoaded = true; return "+919000000001";
      }});
    writeCatchBookingRoster({db: h.db, tx: h.tx, slot,
      booking: booking({status: "cancelled", cancelledAt: now}), now});
    assert.equal(phoneLoaded, false);
    assert.equal(h.docs.get("eventAttendees/att_pointer")?.status,
      "cancelled");
    // A merged write keeps Host-only fields such as party size.
    assert.equal(h.docs.get("eventAttendees/att_pointer")?.partySize, 2);
    assert.equal(h.writes.some((write) =>
      write.path.startsWith("eventAttendeeIndex/")), false);
  });

test("a row already linked to the account is reused", async () => {
  const h = fakeDb({"eventAttendees/att_linked": {eventId: "e1",
    source: "catchBooking", linkedUid: "u1", status: "registered"}});
  const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
    eventId: "e1", uid: "u1", verifiedPhone: async () => "+919000000001"});
  assert.equal(slot.attendeeRef.id, "att_linked");
});

test("two linked rows are left for reconciliation, untouched", async () => {
  const h = fakeDb({
    "eventAttendees/a": {eventId: "e1", linkedUid: "u1", status: "registered"},
    "eventAttendees/b": {eventId: "e1", linkedUid: "u1", status: "registered"},
  });
  const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
    eventId: "e1", uid: "u1"});
  writeCatchBookingRoster({db: h.db, tx: h.tx, slot, booking: booking(), now});
  assert.equal(slot.ambiguous, true);
  assert.deepEqual(h.writes, []);
});

test("a verified phone joins the row the organizer supplied", async () => {
  const phoneRow = eventAttendeeId("e1", "phone:+919000000001");
  const h = fakeDb({[`eventAttendees/${phoneRow}`]: {eventId: "e1",
    source: "hostImport", linkedUid: null, status: "registered",
    phoneE164: "+919000000001"}});
  const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
    eventId: "e1", uid: "u1", verifiedPhone: async () => "+919000000001"});
  assert.equal(slot.attendeeRef.id, phoneRow);
});

test("under ready seats a Host row keeps its status and gains facts",
  async () => {
    const h = fakeDb({
      "eventAttendeeIndex/e1_u1": {attendeeId: "guest"},
      "eventAttendees/guest": {eventId: "e1", source: "hostImport",
        linkedUid: "u1", status: "registered"},
    });
    const slot = await readCatchBookingRoster({db: h.db, tx: h.tx,
      eventId: "e1", uid: "u1"});
    writeCatchBookingRoster({db: h.db, tx: h.tx, slot, now, seatReady: true,
      booking: booking({status: "cancelled", cancelledAt: now})});
    const row = h.docs.get("eventAttendees/guest") as
      {status?: string; booking?: {deletedAt: unknown}};
    assert.equal(row.status, "registered");
    assert.equal(row.booking?.deletedAt, null);
  });
