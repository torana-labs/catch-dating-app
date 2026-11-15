import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {PaymentDocument} from "../shared/generated/firestoreAdminTypes";
import {planLegacyCancellationRefund} from "./legacyRefunds/intent";
import {retainedNativePaymentAmount} from "./paymentAmounts";
import {summarizeContactRevenue} from "../organizers/organizerContacts";
import {catchSpendProjection} from "../organizers/eventRosterInsights";

function partialRefund(): PaymentDocument {
  const payment: PaymentDocument = {purpose: "booking", userId: "user1",
    eventId: "event1",
    orderId: "order_one", paymentId: "pay_one", amount: 1000, currency: "INR",
    provider: "stripe", providerPaymentId: "pi_one",
    stripeAccountId: "acct_one",
    status: "completed", signUpFailed: false,
    createdAt: Timestamp.fromMillis(1)};
  const intent = planLegacyCancellationRefund({payment,
    reason: "guestCancelled", targetAmountMinor: 300, nowMillis: 1});
  return {...payment, cancellationRefund: {...intent, state: "complete",
    confirmedAmountMinor: 300, attempts: [{amountMinor: 300,
      idempotencyKey: "stable_refund_key", providerRefundId: "rfnd_one",
      state: "processed", startedAtMillis: 1}]}};
}

test("CRM and roster spend subtract confirmed partial refunds", () => {
  const payment = partialRefund();
  assert.equal(retainedNativePaymentAmount(payment), 700);
  const revenue = summarizeContactRevenue([payment], new Set(["event1"]),
    "exact");
  assert.equal(revenue.amounts[0].amountMinor, 700);
  const spend = catchSpendProjection([payment], 1000);
  assert.equal(spend.byUid.get("user1")?.[0].amountMinor, 700);
});

test("pending refund liability is distinct from returned cash", () => {
  const payment = partialRefund();
  payment.cancellationRefund = planLegacyCancellationRefund({payment,
    reason: "eventCancelled", targetAmountMinor: 1000, nowMillis: 2});
  assert.equal(retainedNativePaymentAmount(payment), 700);
});

test("inconsistent refund authority does not invent retained revenue", () => {
  const payment = partialRefund(); payment.amount = 2000;
  assert.equal(retainedNativePaymentAmount(payment), null);
  assert.equal(retainedNativePaymentAmount({...partialRefund(),
    status: "refunded"}), 0);
});
