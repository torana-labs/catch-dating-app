import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {Store} from "../../organizerFormAdmission/admissionTestFixture";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {newEventSeatLedger} from "../seatAuthority/eventSeatLedgers";
import {eventListingTermsPatch, preparePrivateListingTerms} from
  "./listingTerms";

const terms = {capacityLimit: 20, priceInPaise: 50000, currency: "INR",
  cancellationPolicyId: "standard" as const};
function setup() {
  const store = new Store();
  const before = {organizerId: "org1", status: "active",
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0} as EventDocument;
  const after = {...before, ...eventListingTermsPatch(before, terms)};
  store.put("eventSeatLedgers/event1", {...newEventSeatLedger("event1",
    before)});
  const run = () => store.db().runTransaction(async (tx) => {
    const result = await preparePrivateListingTerms({db: store.db(), tx,
      eventId: "event1", before, after});
    if (result?.ledger) {
      tx.set(store.db().collection("eventSeatLedgers")
        .doc("event1"), result.ledger);
    }
    return result;
  });
  return {store, before, after, run};
}
const unavailable = (e: unknown) => e instanceof HttpsError &&
  e.code === "failed-precondition";

test("the first terms update the event's ledger atomically", async () => {
  const h = setup();
  const writes = h.store.writes.length;
  h.store.failNextCommit = true;
  await assert.rejects(h.run(), /Interrupted commit/);
  assert.equal(h.store.writes.length, writes);
  await h.run();
  const ledger = h.store.get("eventSeatLedgers/event1")!;
  assert.equal(ledger.policyHash, deriveEventSeatPolicy(h.after).policyHash);
  assert.equal(ledger.capacity, 20);
  assert.equal(ledger.occupied, 0);
  assert.equal(ledger.revision, 2);
});

test("an event without a ready ledger takes no terms", async () => {
  for (const ledger of [undefined, {state: "revoked"}]) {
    const h = setup();
    if (ledger) {
      Object.assign(h.store.get("eventSeatLedgers/event1")!, ledger);
    } else {
      h.store.rows.delete("eventSeatLedgers/event1");
    }
    const writes = h.store.writes.length;
    await assert.rejects(h.run(), unavailable);
    assert.equal(h.store.writes.length, writes);
  }
});

test("reserved and held places keep their price and admission terms",
  async () => {
    for (const reserved of [{occupied: 1}, {checkoutHeld: 1}]) {
      const h = setup();
      await h.run();
      Object.assign(h.before, h.after);
      Object.assign(h.after, eventListingTermsPatch(h.before,
        {...terms, priceInPaise: 90000}));
      Object.assign(h.store.get("eventSeatLedgers/event1")!, reserved);
      const writes = h.store.writes.length;
      await assert.rejects(h.run(), unavailable);
      assert.equal(h.store.writes.length, writes);
    }
  });

test("capacity alone moves while places are reserved, never below them",
  async () => {
    for (const reserved of [{occupied: 3}, {checkoutHeld: 3}]) {
      const h = setup();
      await h.run();
      Object.assign(h.before, h.after);
      Object.assign(h.store.get("eventSeatLedgers/event1")!, reserved);
      Object.assign(h.after, eventListingTermsPatch(h.before,
        {...terms, capacityLimit: 2}));
      await assert.rejects(h.run(), unavailable);
      Object.assign(h.after, eventListingTermsPatch(h.before,
        {...terms, capacityLimit: 30}));
      await h.run();
      const ledger = h.store.get("eventSeatLedgers/event1")!;
      assert.equal(ledger.capacity, 30);
      assert.equal(ledger.policyHash,
        deriveEventSeatPolicy(h.after).policyHash);
    }
  });

test("an event's first terms are set with imported guests already seated",
  async () => {
    const h = setup();
    const born = newEventSeatLedger("event1", h.before);
    assert.equal(born.capacity, null);
    h.store.put("eventSeatLedgers/event1", {...born, occupied: 2});
    Object.assign(h.after, eventListingTermsPatch(h.before,
      {...terms, capacityLimit: 1}));
    await assert.rejects(h.run(), unavailable);
    Object.assign(h.after, eventListingTermsPatch(h.before, terms));
    await h.run();
    const ledger = h.store.get("eventSeatLedgers/event1")!;
    assert.equal(ledger.capacity, 20);
    assert.equal(ledger.occupied, 2);
    assert.equal(ledger.policyHash, deriveEventSeatPolicy(h.after).policyHash);
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
  assert.equal(h.store.get("eventSeatLedgers/event1")!.revision, 3);
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
