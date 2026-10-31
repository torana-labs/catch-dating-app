import assert from "node:assert/strict";
import test from "node:test";
import {eventId, org} from
  "../../organizerFormAdmission/admissionTestFixture";
import {eventParticipationId} from "../../shared/relationshipDocuments";
import {capturedFixture, uid} from "./offerPaymentTestFixture";
import {OFFER_PAYMENT_COLLECTION, parseOfferPayment} from
  "./offerPaymentReservation";
import {cancelPaidOfferForCancelledEvent} from "./offerPaymentCancellation";

async function fixture() {
  const h = await capturedFixture();
  await h.finalize();
  const event = h.store.get(`events/${eventId}`)!;
  event.status = "cancelled";
  const payment = () => parseOfferPayment(h.store.get(
    `${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`), h.paymentId);
  const cancel = () => cancelPaidOfferForCancelledEvent({db: h.store.db(),
    paymentId: h.paymentId, nowMillis: 6_000_000});
  return {...h, event, payment, cancel};
}

test("host cancellation releases its paid seat and preserves financial proof",
  async () => {
    const h = await fixture();
    const original = h.payment();
    const receiptPath = "organizerFormAdmissionReceipts/" +
      original.admissionReceiptId;
    const receipt = JSON.stringify(h.store.get(receiptPath));
    assert.equal(await h.cancel(), true);
    const payment = h.payment();
    assert.equal(payment.status, "refundPending");
    assert.equal(payment.cancellation?.refundAmountPaise, 10000);
    assert.equal(payment.cancellation?.seatRetained, false);
    assert.equal(payment.admissionReceiptId, original.admissionReceiptId);
    assert.equal(JSON.stringify(h.store.get(receiptPath)), receipt);
    assert.equal(h.store.get(`events/${eventId}`)!.bookedCount, 0);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    assert.equal(h.store.get("eventAttendees/" +
      payment.cancellation!.attendeeId)!.status, "cancelled");
    const writes = h.store.writes.length;
    await h.cancel();
    assert.equal(h.store.writes.length, writes);
  });

test("cancellation preserves an independent booking's shared canonical seat",
  async () => {
    const h = await fixture();
    h.store.put("eventParticipations/" + eventParticipationId(eventId, uid),
      {eventId, uid, organizerId: org, status: "signedUp"});
    await h.cancel();
    assert.equal(h.payment().cancellation?.seatRetained, true);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
    assert.equal(h.store.get(`events/${eventId}`)!.bookedCount, 1);
  });

test("active event and corrupt admission proof cannot queue a refund",
  async () => {
    const h = await fixture();
    h.event.status = "active";
    assert.equal(await h.cancel(), false);
    h.event.status = "cancelled";
    h.store.get("organizerFormAdmissionReceipts/" +
      h.payment().admissionReceiptId)!.requestHash = "a".repeat(64);
    const before = JSON.stringify([...h.store.rows]);
    await assert.rejects(h.cancel());
    assert.equal(JSON.stringify([...h.store.rows]), before);
  });

test("failed cancellation commit changes neither admission nor seat",
  async () => {
    const h = await fixture();
    const before = JSON.stringify([...h.store.rows]);
    h.store.failNextCommit = true;
    await assert.rejects(h.cancel(), /Interrupted commit/u);
    assert.equal(JSON.stringify([...h.store.rows]), before);
    await h.cancel();
    assert.equal(h.payment().status, "refundPending");
  });

test("cancellation preserves an in-flight settlement lease", async () => {
  const h = await fixture();
  const current = h.payment();
  h.store.get(`${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!.settlement = {
    ...current.settlement, leaseId: "a".repeat(32), leaseUntilMillis: 7_000_000,
    state: "releasePending", transferId: "trf_one",
    authorizedAtMillis: 5_900_000, completedAtMillis: 5_800_000};
  await h.cancel();
  assert.equal(h.payment().settlement?.leaseUntilMillis, 7_000_000);
  assert.equal(h.payment().status, "refundPending");
});

test("temporary migration lock retries cancellation after the fence unlocks",
  async () => {
    const h = await fixture();
    const fence = h.store.get(`eventSeatMigrationFences/${eventId}`)!;
    fence.state = "locked";
    await assert.rejects(h.cancel(), {code: "unavailable"});
    assert.equal(h.payment().status, "admitted");
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
    fence.state = "ready";
    assert.equal(await h.cancel(), true);
    assert.equal(h.payment().status, "refundPending");
  });

for (const amount of [0, 10000]) {
  test(`guest cancellation of ${amount} paise replays once`, async () => {
    const h = await fixture();
    h.event.status = "active";
    h.store.get(`${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!
      .cancellationPolicy = {
        refundDeadlineMillis: amount ? 3000 : 2000, eventStartsAtMillis:
        5_000_000};
    const cancel = (expected = amount, user = uid) =>
      cancelPaidOfferForCancelledEvent({
        db: h.store.db(), paymentId: h.paymentId, nowMillis: 3000,
        guest: {uid: user, expectedRefundAmountPaise: expected}});
    const before = JSON.stringify([...h.store.rows]);
    await assert.rejects(cancel(amount, "other"), {code: "permission-denied"});
    await assert.rejects(cancel(amount ? 0 : 10000), {code:
      "failed-precondition"});
    assert.equal(JSON.stringify([...h.store.rows]), before);
    await cancel();
    assert.equal(h.payment().status, amount ? "refundPending" : "cancelled");
    assert.equal(h.payment().cancellation?.reason, "guestCancelled");
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    const writes = h.store.writes.length;
    await cancel();
    assert.equal(h.store.writes.length, writes);
  });
}

test("guest cancellation rejects started, checked-in or legacy admissions",
  async () => {
    for (const mode of ["started", "checkedIn", "legacy"] as const) {
      const h = await fixture();
      h.event.status = "active";
      const row = h.store.get(`${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!;
      row.cancellationPolicy = {refundDeadlineMillis: 4000,
        eventStartsAtMillis: 5_000_000};
      if (mode === "legacy") delete row.cancellationPolicy;
      if (mode === "checkedIn") {
        const receipt = h.store.get("organizerFormAdmissionReceipts/" +
        h.payment().admissionReceiptId)!;
      h.store.get(`eventAttendees/${receipt.attendeeId}`)!.status = "checkedIn";
      }
      const before = JSON.stringify([...h.store.rows]);
      await assert.rejects(cancelPaidOfferForCancelledEvent({db: h.store.db(),
        paymentId: h.paymentId, nowMillis:
          mode === "started" ? 5_000_000 : 3000,
        guest: {uid, expectedRefundAmountPaise: 10000}}));
      assert.equal(JSON.stringify([...h.store.rows]), before);
    }
  });

test("host cancellation upgrades no-refund without releasing twice",
  async () => {
    const h = await fixture(); h.event.status = "active";
  h.store.get(`${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!
    .cancellationPolicy = {
      refundDeadlineMillis: 2000, eventStartsAtMillis: 5_000_000};
  await cancelPaidOfferForCancelledEvent({db: h.store.db(), paymentId:
    h.paymentId,
  nowMillis: 3000, guest: {uid, expectedRefundAmountPaise: 0}});
  h.store.get(`events/${eventId}`)!.status = "cancelled";
  await h.cancel();
  assert.equal(h.payment().status, "refundPending");
  assert.equal(h.payment().cancellation?.reason, "eventCancelled");
  assert.equal(h.payment().cancellation?.refundAmountPaise, 10000);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
  });
