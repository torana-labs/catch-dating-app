import assert from "node:assert/strict";
import test from "node:test";
import {
  publicCapturedFixture,
  eventId,
  uid,
  now,
} from "./testFixture";
import {
  PUBLIC_PAYMENT_COLLECTION,
  parsePublicPayment,
  publicPaymentLedger,
} from "./paymentLedger";
import {readPublicPaidAdmission} from "./admissionProof";
import {isPublicPaymentBooking} from "./catchBookingBridge";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";

const edge = `eventParticipations/${eventId}_${uid}`;

async function catchUserFixture() {
  const h = await publicCapturedFixture();
  h.store.put(`users/${uid}`, {
    uid,
    name: "Ada Guest",
    gender: "woman",
    interestedInGenders: ["man"],
  });
  Object.assign(h.store.get(`events/${eventId}`)!, {
    genderCounts: {woman: 3},
    cohortCounts: {womenInterestedInMen: 3},
  });
  return h;
}

function cancel(
  h: Awaited<ReturnType<typeof catchUserFixture>>,
  at: number,
  guest?: {uid: string; expectedRefundAmountPaise: number},
) {
  return cancelPaidEventAdmission({
    db: h.store.db(),
    paymentId: h.paymentId,
    nowMillis: at,
    ledger: publicPaymentLedger,
    readAdmission: readPublicPaidAdmission,
    guest,
  });
}

test("only organizer-routed payment ids mark a bridged booking", () => {
  assert.equal(isPublicPaymentBooking("pp_abc"), true);
  assert.equal(isPublicPaymentBooking("pp_abc", "pp_abc"), true);
  assert.equal(isPublicPaymentBooking("pp_abc", "pp_other"), false);
  assert.equal(isPublicPaymentBooking("pay_native"), false);
  assert.equal(isPublicPaymentBooking(null), false);
});

test("a Catch user's paid admission is also their app booking", async () => {
  const h = await catchUserFixture();
  assert.equal(await h.finalize(), "admitted");
  assert.equal(await h.finalize(), "admitted");
  const participation = h.store.get(edge);
  assert.equal(participation?.status, "signedUp");
  assert.equal(participation?.paymentId, h.paymentId);
  assert.equal(participation?.genderAtSignup, "woman");
  assert.equal(participation?.cohortAtSignup, "womenInterestedInMen");
  const event = h.store.get(`events/${eventId}`)!;
  assert.equal(event.bookedCount, 1);
  assert.deepEqual(event.cohortCounts, {womenInterestedInMen: 4});
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
});

test("an active edge without a seat blocks admission for refund", async () => {
  const h = await catchUserFixture();
  h.store.put(edge, {eventId, uid, organizerId: "x", status: "signedUp"});
  assert.equal(await h.finalize(), "refundPending");
  assert.equal(h.store.get(edge)?.paymentId, undefined);
});

for (const refund of [0, 10000]) {
  test(`guest cancellation cancels the app booking: ${refund}`, async () => {
    const h = await catchUserFixture();
    await h.finalize();
    const at = refund ? now + 30 : 99_000_000;
    assert.equal(
      await cancel(h, at, {uid, expectedRefundAmountPaise: refund}),
      true,
    );
    const p = parsePublicPayment(
      h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
      h.paymentId,
    );
    assert.equal(p.status, refund ? "refundPending" : "cancelled");
    assert.equal(p.cancellation?.seatRetained, false);
    assert.equal(h.store.get(edge)?.status, "cancelled");
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 0);
    const event = h.store.get(`events/${eventId}`)!;
    assert.equal(event.bookedCount, 0);
    assert.deepEqual(event.cohortCounts, {womenInterestedInMen: 3});
  });
}

test("host cancellation refunds and keeps the app edge", async () => {
  const h = await catchUserFixture();
  await h.finalize();
  h.store.get(`events/${eventId}`)!.status = "cancelled";
  assert.equal(await cancel(h, now + 30), true);
  const p = parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
    h.paymentId,
  );
  assert.equal(p.status, "refundPending");
  assert.equal(p.cancellation?.refundAmountPaise, p.amountPaise);
  assert.equal(p.cancellation?.seatRetained, false);
  assert.equal(h.store.get(edge)?.status, "signedUp");
});

test("an independent native booking still owns its seat", async () => {
  const h = await catchUserFixture();
  await h.finalize();
  h.store.get(edge)!.paymentId = "pay_native";
  assert.equal(
    await cancel(h, now + 30, {uid, expectedRefundAmountPaise: 10000}),
    true,
  );
  const p = parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
    h.paymentId,
  );
  assert.equal(p.cancellation?.seatRetained, true);
  assert.equal(h.store.get(edge)?.status, "signedUp");
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
});
