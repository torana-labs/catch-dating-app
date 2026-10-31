import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {Store} from "../../organizerFormAdmission/admissionTestFixture";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {eventListingTermsPatch, preparePrivateListingTerms} from
  "./listingTerms";

const terms = {capacityLimit: 20, priceInPaise: 50000, currency: "INR",
  cancellationPolicyId: "standard" as const};
function setup() {
  const store = new Store();
  const before = {organizerId: "org1", status: "active",
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0} as EventDocument;
  const after = {...before, ...eventListingTermsPatch(before, terms)};
  const run = () => store.db().runTransaction(async (tx) => {
    const result = await preparePrivateListingTerms({db: store.db(), tx,
      eventId: "event1", before, after});
    if (result?.ledger) {
      tx.set(store.db().collection("eventSeatLedgers")
        .doc("event1"), result.ledger);
    }
    if (result?.fence) {
      tx.create(store.db().collection("eventSeatMigrationFences")
        .doc("event1"), result.fence);
    }
    return result;
  });
  return {store, before, after, run};
}
const unavailable = (e: unknown) => e instanceof HttpsError &&
  e.code === "failed-precondition";

test("fresh empty event initializes authority atomically", async () => {
  const h = setup();
  h.store.failNextCommit = true;
  await assert.rejects(h.run(), /Interrupted commit/);
  assert.equal(h.store.writes.length, 0);
  await h.run();
  const ledger = h.store.get("eventSeatLedgers/event1")!;
  assert.equal(ledger.policyHash, deriveEventSeatPolicy(h.after).policyHash);
  assert.equal(ledger.capacity, 20);
  assert.equal(ledger.occupied, 0);
  assert.equal(ledger.checkoutHeld, 0);
  const mode = await h.store.db().runTransaction((tx) =>
    readSeatMigrationWriterFence({db: h.store.db(), tx, eventId: "event1"}));
  assert.equal(mode, "ready");
});

test("fresh initialization fences markers and history", async () => {
  for (const field of ["bookedCount", "checkedInCount", "waitlistedCount"]) {
    const h = setup();
    Object.assign(h.before, {[field]: 1});
    await assert.rejects(h.run(), unavailable);
  }
  for (const counts of [{crossPathsPairHeldCount: 1},
    {crossPathsPairConfirmedCount: 1}, {genderCounts: {man: 1}},
    {cohortCounts: {a: 1}}, {waitlistedCohortCounts: {a: 1}},
    {crossPathsPairHeldCohortCounts: {a: 1}}]) {
    const h = setup();
    Object.assign(h.before, counts);
    await assert.rejects(h.run(), unavailable);
  }
  for (const marker of [{demoOps: true}, {synthetic: true},
    {seedPrefix: "demo"}]) {
    const h = setup();
    Object.assign(h.before, marker);
    await assert.rejects(h.run(), unavailable);
  }
  for (const collection of ["eventAttendees", "eventParticipations",
    "eventWaitlistOffers", "publicEventPayments", "payments",
    "organizerEventOfferPayments", "organizerContactOrigins",
    "eventSeatReservations", "eventSeatIdentityAliases",
    "eventAttendeeImports", "razorpayPendingOrders",
    "eventSeatMigrationRuns"]) {
    const h = setup();
    h.store.put(`${collection}/event1`, {eventId: "event1",
      status: "cancelled"});
    await assert.rejects(h.run(), unavailable, collection);
    assert.equal(h.store.writes.length, 0);
  }
});

test("reserved and held places fence policy changes", async () => {
  for (const reserved of [{occupied: 1}, {checkoutHeld: 1}]) {
    const h = setup();
    await h.run();
    Object.assign(h.before, h.after);
    Object.assign(h.after, eventListingTermsPatch(h.before,
      {...terms, capacityLimit: 30}));
    Object.assign(h.store.get("eventSeatLedgers/event1")!, reserved);
    const writes = h.store.writes.length;
    await assert.rejects(h.run(), unavailable);
    assert.equal(h.store.writes.length, writes);
  }
});

test("empty ledger changes capacity; no-op preserves revision", async () => {
  const h = setup();
  await h.run();
  Object.assign(h.before, h.after);
  assert.equal(await h.run(), null);
  Object.assign(h.after, eventListingTermsPatch(h.before,
    {...terms, capacityLimit: 30}));
  await h.run();
  assert.equal(h.store.get("eventSeatLedgers/event1")!.capacity, 30);
  assert.equal(h.store.get("eventSeatLedgers/event1")!.revision, 2);
});

test("term edits preserve restrictions and validate refunds", () => {
  const h = setup();
  h.after.eventPolicy!.admission.membershipRequired = true;
  h.after.eventPolicy!.admission.manualApprovalRequired = true;
  const next = eventListingTermsPatch(h.after, {...terms, capacityLimit: 30});
  assert.equal(next.eventPolicy!.admission.membershipRequired, true);
  assert.equal(next.eventPolicy!.admission.manualApprovalRequired, true);
  assert.throws(() => eventListingTermsPatch(h.before,
    {...terms, priceInPaise: 0}), (e) => e instanceof HttpsError &&
    e.code === "invalid-argument");
});
