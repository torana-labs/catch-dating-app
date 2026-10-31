import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  publicFixture,
  publicCapturedFixture,
  eventId,
  uid,
  phone,
  now,
} from "./testFixture";
import {CHECKOUT_HOLD_MILLIS} from "../seatAuthority/seatAuthority";
import {
  PUBLIC_PAYMENT_COLLECTION,
  PUBLIC_ADMISSION_COLLECTION,
  parsePublicPayment,
  publicPaymentLedger,
} from "./paymentLedger";
import {readPublicPaidAdmission} from "./admissionProof";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";

test("public hold replay neither renews nor admits", async () => {
  const h = await publicFixture();
  const first = await h.reserve();
  assert.ok("payment" in first);
  const replay = await h.reserve({nowMillis: () => now + 100});
  assert.ok("payment" in replay);
  assert.equal(replay.replayed, true);
  assert.equal(
    replay.payment.checkoutExpiresAt.toMillis(),
    now + CHECKOUT_HOLD_MILLIS,
  );
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld, 1);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 0);
  assert.equal(
    [...h.store.rows.keys()].some((k) => k.startsWith("eventAttendees/")),
    false,
  );
  await assert.rejects(h.reserve({displayName: "Different Guest"}));
  await assert.rejects(h.reserve({requestId: "another_request"}));
});

test("changed terms or unavailable identities block checkout", async () => {
  for (const kind of [
    "quote",
    "currency",
    "disabled",
    "phone",
    "deleted",
    "closed",
    "private",
    "full",
  ]) {
    const h = await publicFixture();
    const reviewed = h.quote();
    if (kind === "quote") h.event.priceInPaise = 20000;
    if (kind === "currency") h.event.currency = "USD";
    if (kind === "closed") h.event.publicRegistrationEnabled = false;
    if (kind === "private") h.event.publicationState = "private";
    if (kind === "deleted") h.store.put(`deletedUsers/${uid}`, {});
    if (kind === "full") {
      h.store.get(`eventSeatLedgers/${eventId}`)!.occupied = 2;
    }
    await assert.rejects(
      h.reserve({
        reviewedQuote: reviewed,
        ...(kind === "disabled" || kind === "phone" ?
          {
            loadCurrentAuthUser: async () => ({
              uid,
              disabled: kind === "disabled",
              phoneNumber: kind === "phone" ? "+919888888888" : phone,
            }),
          } :
          {}),
      }),
      kind,
    );
    assert.equal(
      [...h.store.rows.keys()].some((k) =>
        k.startsWith(`${PUBLIC_PAYMENT_COLLECTION}/`),
      ),
      false,
    );
  }
});

test("public capture admits once without form authority", async () => {
  const h = await publicCapturedFixture();
  assert.equal(await h.finalize(), "admitted");
  assert.equal(await h.finalize(), "admitted");
  const p = parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
    h.paymentId,
  );
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld, 0);
  assert.equal(
    h.store.get(`eventAttendees/${p.attendeeId}`)?.linkedUid,
    uid,
  );
  assert.equal(
    h.store.get(`eventAttendees/${p.attendeeId}`)?.revenueOrderReference,
    "order_one",
  );
  assert.ok(
    h.store.get(`${PUBLIC_ADMISSION_COLLECTION}/${p.admissionReceiptId}`),
  );
  assert.equal(
    [...h.store.rows.keys()].some((k) =>
      /^(organizerForm|organizerApplications|eventParticipations)/u.test(k),
    ),
    false,
  );
  const already = await h.reserve({requestId: "already_registered"});
  assert.ok("admission" in already);
  assert.equal(already.admission.attendeeId, p.attendeeId);
});

test("closing preserves a hold; unpublishing refunds it", async () => {
  const h = await publicCapturedFixture();
  Object.assign(h.event, {
    publicRegistrationEnabled: false,
    publicRegistrationMode: "closed",
    publicRegistrationRevision: 2,
  });
  assert.equal(await h.finalize(), "admitted");
  const unpublished = await publicCapturedFixture();
  unpublished.event.publicationState = "private";
  assert.equal(await unpublished.finalize(), "refundPending");
  assert.equal(
    unpublished.store.get(`eventSeatLedgers/${eventId}`)?.occupied,
    0,
  );
  assert.equal(
    unpublished.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld,
    0,
  );
});

test("expired or changed-identity capture needs refund", async () => {
  for (const expired of [true, false]) {
    const h = await publicCapturedFixture();
    assert.equal(
      await h.finalize(
        expired ?
          {nowMillis: now + CHECKOUT_HOLD_MILLIS} :
          {
            loadCurrentAuthUser: async () => ({
              uid,
              phoneNumber: "+919888888888",
            }),
          },
      ),
      "refundPending",
    );
    assert.equal(
      h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld,
      0,
    );
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 0);
  }
});

test("interrupted admission is atomic", async () => {
  const h = await publicCapturedFixture();
  h.store.failNextCommit = true;
  await assert.rejects(h.finalize(), /Interrupted commit/u);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.checkoutHeld, 1);
  assert.equal(
    [...h.store.rows.keys()].some((k) =>
      k.startsWith(`${PUBLIC_ADMISSION_COLLECTION}/`),
    ),
    false,
  );
  assert.equal(await h.finalize(), "admitted");
});

for (const refund of [0, 10000]) {
  test(`public cancellation: ${refund} refund and seat release`, async () => {
    const h = await publicCapturedFixture();
    await h.finalize();
    const at = refund ? now + 30 : 99_000_000;
    const cancel = (expectedRefundAmountPaise: number) =>
      cancelPaidEventAdmission({
        db: h.store.db(),
        paymentId: h.paymentId,
        nowMillis: at,
        ledger: publicPaymentLedger,
        readAdmission: readPublicPaidAdmission,
        guest: {uid, expectedRefundAmountPaise},
      });
    await assert.rejects(cancel(refund ? 0 : 10000));
    assert.equal(await cancel(refund), true);
    assert.equal(await cancel(refund), true);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 0);
    const p = parsePublicPayment(
      h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
      h.paymentId,
    );
    assert.equal(p.status, refund ? "refundPending" : "cancelled");
    assert.equal(await h.finalize({nowMillis: at + 10}), "unchanged");
  });
}

test("a foreign receipt cannot prove public admission", async () => {
  const h = await publicCapturedFixture();
  await h.finalize();
  const p = parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
    h.paymentId,
  );
  h.store.get(
    `${PUBLIC_ADMISSION_COLLECTION}/${p.admissionReceiptId}`,
  )!.recipientUid = "other";
  await assert.rejects(h.finalize());
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  assert.equal(
    p.admittedAt?.toMillis(),
    Timestamp.fromMillis(now + 20).toMillis(),
  );
});

test("rebooking cannot revive an old charge", async () => {
  const h = await publicCapturedFixture();
  await h.finalize();
  await cancelPaidEventAdmission({
    db: h.store.db(),
    paymentId: h.paymentId,
    nowMillis: 99_000_000,
    ledger: publicPaymentLedger,
    readAdmission: readPublicPaidAdmission,
    guest: {uid, expectedRefundAmountPaise: 0},
  });
  const next = await h.reserve({
    requestId: "public_rebook_2",
    nowMillis: () => 99_000_001,
  });
  assert.ok("payment" in next);
  Object.assign(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${next.paymentId}`)!,
    {
      status: "captured",
      providerOrderId: "order_two",
      providerPaymentId: "pay_two",
      capturedAt: Timestamp.fromMillis(99_000_010),
    },
  );
  assert.equal(
    await h.finalize({paymentId: next.paymentId, nowMillis: 99_000_020}),
    "admitted",
  );
  assert.equal(await h.finalize({nowMillis: 99_000_030}), "unchanged");
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  assert.equal(
    h.store.get(`eventAttendees/${next.payment.attendeeId}`)
      ?.revenueOrderReference,
    "order_two",
  );
});

test("native booking does not create another payment", async () => {
  const h = await publicCapturedFixture();
  await h.finalize();
  const old = parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`),
    h.paymentId,
  );
  h.store.get(`eventAttendees/${old.attendeeId}`)!.source = "catchBooking";
  h.store.put(`eventParticipations/${eventId}_${uid}`, {
    eventId,
    uid,
    organizerId: old.organizerId,
    status: "signedUp",
  });
  const next = await h.reserve({requestId: "native_already_registered"});
  assert.ok("admission" in next);
  assert.equal(next.admission.attendeeId, old.attendeeId);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  h.store.get(`eventParticipations/${eventId}_${uid}`)!.status =
    "cancelled";
  await assert.rejects(h.reserve({requestId: "native_stale_booking"}));
});
