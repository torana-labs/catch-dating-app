import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {getEventViewerStateHandler as read} from "./eventViewerState";
import type {EventViewerStateSource} from "./eventViewerStateSource";

const request = (data: unknown, uid = "person") => ({data,
  auth: {uid, token: {}}}) as unknown as CallableRequest<unknown>;
const code = (expected: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === expected;

function fixture() {
  const calls: unknown[] = [];
  const viewer: EventViewerStateSource = {eventId: "event1",
    organizerId: "org1", observedAtMillis: 2000,
    membership: {state: "revoked", revision: 2, decisionId: "decision2"},
    review: "approved", admission: "nativeParticipation",
    attendance: "notRecorded", waitlisted: false, payment: "notRead",
    futureBooking: {allowed: false, reason: "membershipRequired"},
    route: null, quotedPriceInPaise: null,
    basis: {policyHash: null, inventoryRevision: null,
      capacityRevision: null, migrationRevision: null}};
  const db = {} as FirebaseFirestore.Firestore;
  const deps = {db: () => db, nowMillis: () => 2000,
    read: async (args: unknown) => {
      calls.push(args); return viewer;
    }};
  return {calls, viewer, db, deps};
}

test("Auth and strict ownership precede database access", async () => {
  const h = fixture();
  const deps = {...h.deps, db: () => {
    throw new Error("No database read");
  }};
  await assert.rejects(read({data: {eventId: "event1"}} as
    CallableRequest<unknown>, deps), code("unauthenticated"));
  for (const injected of [{uid: "other"}, {organizerId: "other"},
    {eventId: ""}, {publicPaymentId: ""}]) {
    await assert.rejects(read(request({eventId: "event1", ...injected}), deps),
      code("invalid-argument"));
  }
  assert.deepEqual(h.calls, []);
});

test("scope and clock use the authenticated actor", async () => {
  const h = fixture();
  const result = await read(request({eventId: "event1", inviteCode: "invite1",
    publicPaymentId: "ownedPayment1"}), h.deps);
  assert.deepEqual(h.calls, [
    {db: h.db, uid: "person", eventId: "event1", inviteCode: "invite1",
      publicPaymentId: "ownedPayment1", nowMillis: 2000}]);
  assert.equal(result.viewer.admission, "nativeParticipation");
  assert.equal(result.viewer.membership.state, "revoked");
  assert.equal(result.viewer.futureBooking.allowed, false);
});

test("unavailable sources have one privacy-preserving result", async () => {
  const h = fixture();
  await assert.rejects(read(request({eventId: "event1"}), {...h.deps,
    read: async () => null}), (error: unknown) => error instanceof HttpsError &&
      error.code === "not-found" &&
      error.message === "This event is unavailable.");
});

test("private fields and contradictions cannot escape the DTO", async () => {
  for (const extra of [{phoneNumber: "+919000000001"},
    {futureBooking: {allowed: true, reason: "membershipRequired"}}]) {
    const h = fixture();
    await assert.rejects(read(request({eventId: "event1"}), {...h.deps,
      read: async () => ({...h.viewer, ...extra}) as EventViewerStateSource}),
    code("internal"));
  }
});

test("infrastructure and quota errors remain distinct", async () => {
  const h = fixture();
  const failure = new RangeError("Synthetic infrastructure failure");
  await assert.rejects(read(request({eventId: "event1"}), {...h.deps,
    read: async () => {
      throw failure;
    }}), (error) => error === failure);
  h.calls.length = 0;
  const overLimit = request({eventId: "event1"}, "over-limit");
  for (let call = 0; call < 60; call += 1) await read(overLimit, h.deps);
  h.calls.length = 0;
  await assert.rejects(read(overLimit, h.deps), code("resource-exhausted"));
  assert.deepEqual(h.calls, []);
});
