import assert from "node:assert/strict";
import {createFormPaymentFixture} from
  "../formPayments/formPaymentTestStore";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {eventId, contactId, offerId, responseId} from
  "../../organizerFormAdmission/admissionTestFixture";
import {CHECKOUT_HOLD_MILLIS} from "../../domain/payments/checkoutHold";
import {OFFER_PAYMENT_COLLECTION} from
  "./offerPaymentReservation";
import {setup, capturedFixture, uid, phone, now} from
  "./offerPaymentTestFixture";

test("payment attempt and canonical checkout hold commit together",
  async () => {
    const h = await setup();
    const originalResponse = JSON.stringify(h.store.get(
      `organizerFormResponses/${responseId}`));
    const result = await h.reserve();
    const ledger = h.store.get(`eventSeatLedgers/${eventId}`)!;
    assert.equal(ledger.occupied, 0);
    assert.equal(ledger.checkoutHeld, 1);
    assert.equal(h.store.get(`events/${eventId}`)!.bookedCount, 0);
    const held = [...h.store.rows].find(([path]) =>
      path.startsWith("eventSeatReservations/"))![1];
    assert.deepEqual(held.checkoutHold, {paymentId: result.paymentId,
      expiresAtMillis: now + CHECKOUT_HOLD_MILLIS});
    assert.equal(result.payment.providerOrderId, null);
    assert.equal(result.payment.routing.settlementHold, true);
    assert.equal(result.payment.checkoutExpiresAt.toMillis(),
      now + CHECKOUT_HOLD_MILLIS);
    assert.equal(JSON.stringify(h.store.get(
      `organizerFormResponses/${responseId}`)), originalResponse);
    const before = h.store.writes.length;
    const replay = await h.reserve("checkout_request1", now + 5000,
      {...h.routing, destinationAccountId: "acc_different"});
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.payment, result.payment);
    assert.equal(h.store.writes.length, before);
    await assert.rejects(h.reserve("checkout_request2"));
    assert.equal(h.store.writes.length, before);
  });

test("changed routing, source, quotas or unavailable seats never reserve",
  async () => {
    const mutations: Array<(h: Awaited<ReturnType<typeof setup>>) => void> = [
      (h) => {
        h.store.get("paymentRoutingPolicies/app")!.revision = 2;
      },
      (h) => {
        h.store.get(`hostPaymentAccounts/${h.bindingId}`)!
          .payoutsEnabled = false;
      },
      (h) => {
        h.store.get(`organizerEventOffers/${offerId}`)!
          .status = "withdrawn";
      },
      (h) => {
        h.store.get(`organizerContacts/${contactId}`)!
          .phoneE164 = "+918888888888";
      },
      (h) => {
        h.store.get(`eventSeatLedgers/${eventId}`)!.occupied = 2;
        h.store.get(`events/${eventId}`)!.bookedCount = 2;
      },
      (h) => {
        h.store.get(`events/${eventId}`)!.constraints = {maxMen: 1};
      },
      (h) => {
        h.store.get(`eventSeatLedgers/${eventId}`)!
          .state = "revoked";
      },
      (h) => {
        h.store.put(`deletedUsers/${uid}`, {status: "processing"});
      },
    ];
    for (const mutate of mutations) {
      const h = await setup();
      mutate(h);
      const before = [...h.store.rows].map(([path, row]) =>
        [path, JSON.stringify(row)]);
      await assert.rejects(h.reserve());
      assert.deepEqual([...h.store.rows].map(([path, row]) =>
        [path, JSON.stringify(row)]), before);
    }
  });

test("offer must have enough validity for the full checkout hold", async () => {
  const h = await setup();
  await assert.rejects(h.reserve("checkout_request1", 4_000_000 -
    CHECKOUT_HOLD_MILLIS + 1));
  const result = await h.reserve("checkout_request1", 4_000_000 -
    CHECKOUT_HOLD_MILLIS);
  assert.equal(result.payment.checkoutExpiresAt.toMillis(), 4_000_000);
});

test("expiry releases only its own hold even after source withdrawal",
  async () => {
    const h = await setup();
    const {paymentId} = await h.reserve();
    const before = h.store.writes.length;
    await h.expire(paymentId, now + CHECKOUT_HOLD_MILLIS - 1);
    assert.equal(h.store.writes.length, before);
    h.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
    h.store.put(`deletedUsers/${uid}`, {status: "processing"});
    await h.expire(paymentId);
    const payment = h.store.get(`${OFFER_PAYMENT_COLLECTION}/${paymentId}`)!;
    assert.equal(payment.reservationReleased, true);
    assert.equal(payment.status, "expired");
    const ledger = h.store.get(`eventSeatLedgers/${eventId}`)!;
    assert.equal(ledger.checkoutHeld, 0);
    assert.equal(ledger.occupied, 0);
    const after = h.store.writes.length;
    await h.expire(paymentId);
    assert.equal(h.store.writes.length, after);
  });

test("capture after hold deadline is pending refund and never admission",
  async () => {
    const h = await setup();
    const {paymentId} = await h.reserve();
    Object.assign(h.store.get(`${OFFER_PAYMENT_COLLECTION}/${paymentId}`)!,
      {status: "captured", providerOrderId: "order_one",
        providerPaymentId: "pay_one", capturedAt: Timestamp.fromMillis(now)});
    await h.expire(paymentId);
    const payment = h.store.get(`${OFFER_PAYMENT_COLLECTION}/${paymentId}`)!;
    assert.equal(payment.status, "refundPending");
    assert.equal(payment.admissionReceiptId, null);
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    assert.equal([...h.store.rows].some(([path]) =>
      path.startsWith("organizerFormAdmissions/")), false);
  });

test("verified capture atomically confirms admission and frozen receipt",
  async () => {
    const h = await capturedFixture();
    assert.equal(await h.finalize(), "admitted");
    const ledger = h.store.get(`eventSeatLedgers/${eventId}`)!;
    assert.equal(ledger.occupied, 1);
    assert.equal(ledger.checkoutHeld, 0);
    assert.equal(h.store.get(`events/${eventId}`)!.bookedCount, 1);
    const payment = h.store.get(
      `${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!;
    assert.equal(payment.status, "admitted");
    const receipt = h.store.get(
      `organizerFormAdmissionReceipts/${payment.admissionReceiptId}`)!;
    assert.equal((receipt.providerPayment as Record<string, unknown>)
      .paymentId, h.paymentId);
    const attendee = h.store.get(`eventAttendees/${receipt.attendeeId}`)!;
    assert.equal(attendee.linkedUid, uid);
    assert.equal(attendee.phoneE164, phone);
    assert.equal(attendee.revenueSource, "providerOrder");
    assert.equal(attendee.revenueAmountMinor, 10000);
    assert.equal(h.store.get(`organizerFormResponses/${responseId}`)!
      .respondentUid, null);
    const before = h.store.writes.length;
    h.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
    assert.equal(await h.finalize(5_000_000), "admitted");
    await h.expire(h.paymentId, 5_000_000);
    assert.equal(h.store.writes.length, before);
  });

test("expired or revoked paid offers release for refund without admission",
  async () => {
    for (const expire of [false, true]) {
      const h = await capturedFixture();
      if (!expire) {
        h.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
      }
      assert.equal(await h.finalize(expire ? now + CHECKOUT_HOLD_MILLIS :
        now + 20), "refundPending");
      const payment = h.store.get(
        `${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!;
      assert.equal(payment.status, "refundPending");
      assert.equal(payment.admissionReceiptId, null);
      assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.checkoutHeld, 0);
      assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
    }
  });

test("uncertain admission commit leaves capture recoverable without refund",
  async () => {
    const h = await capturedFixture();
    const before = JSON.stringify([...h.store.rows]);
    h.store.failNextCommit = true;
    await assert.rejects(h.finalize(), /Interrupted commit/u);
    assert.equal(JSON.stringify([...h.store.rows]), before);
    assert.equal(await h.finalize(), "admitted");
    assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
  });

test("historical receipt mismatch cannot report admission or trigger refund",
  async () => {
    for (const field of ["receiptId", "requestId", "requestHash",
      "paymentSnapshot"]) {
      const h = await capturedFixture();
      await h.finalize();
      const payment = h.store.get(
        `${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`)!;
      const receipt = h.store.get(
        `organizerFormAdmissionReceipts/${payment.admissionReceiptId}`)!;
      if (field === "paymentSnapshot") {
        receipt[field] = {...receipt[field] as Record<string, unknown>,
          expectedAmountMinor: 999};
      } else {
        receipt[field] = field === "requestHash" ? "a".repeat(64) : "wrong";
      }
      const before = h.store.writes.length;
      await assert.rejects(h.finalize());
      assert.equal(h.store.writes.length, before);
      assert.equal(payment.status, "admitted");
    }
  });

test("new OAuth reservation rejects a merchant that became ambiguous",
  async () => {
    for (const ambiguous of [false, true]) {
      const h = await setup();
      const form = createFormPaymentFixture();
      const connection: Record<string, unknown> = {...form.store.records.get(
        "organizerPaymentConnections/connection")!, organizerId: "org1"};
      h.store.put("organizerPaymentConnections/merchant1", connection);
      if (ambiguous) {
        h.store.put("organizerPaymentConnections/merchant2", {...connection});
      }
      const selection = {...h.routing.selection,
        route: "razorpayOAuth" as const};
      h.store.get("paymentRoutingPolicies/app")!.eventAdmission = selection;
      const routing = {...h.routing, selection, bindingId: "merchant1",
        merchantAccountId: connection.accountId as string,
        checkoutKey: connection.publicToken as string,
        destinationAccountId: null, transferAmountMinor: null,
        settlementHold: null};
      const writes = h.store.writes.length;
      if (ambiguous) {
        await assert.rejects(h.reserve("checkout_request1", now, routing));
        assert.equal(h.store.writes.length, writes);
      } else {
        const result = await h.reserve("checkout_request1", now, routing);
        assert.equal(result.payment.routing.bindingId, "merchant1");
      }
    }
  });
