import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  billIssue,
  checkoutIssue,
  nativeIssue,
  resolutionId,
} from "./paymentIssues";

const now = 10 * 86_400_000;
const at = (ms: number) => Timestamp.fromMillis(ms);

test("a capture the sweep has not admitted in 15 minutes is an issue", () => {
  const paid = {status: "captured", organizerId: "afterfly", eventId: "ev",
    eventName: "Takeoff: Run + Rave", displayName: "Rhea Kapoor",
    amountPaise: 150_000, capturedAt: at(now - 20 * 60_000),
    admissionReceiptId: null, providerPaymentId: "pay_1", lastErrorCode: null};
  const issue = checkoutIssue("publicEventPayments", "pp_1", paid, now);
  assert.equal(issue?.kind, "payment");
  assert.equal(issue?.title, "₹1,500 paid, booking not confirmed");
  assert.equal(issue?.subtitle, "Rhea Kapoor · Takeoff: Run + Rave");
  assert.equal(issue?.canConfirmBooking, true);
  assert.equal(issue?.issueId, "publicEventPayments:pp_1");
  assert.equal(checkoutIssue("publicEventPayments", "pp_1",
    {...paid, capturedAt: at(now - 60_000)}, now), null);
  assert.equal(checkoutIssue("publicEventPayments", "pp_1",
    {...paid, admissionReceiptId: "r"}, now), null);
});

test("stale refunds and review records are issues; admitted ones are not",
  () => {
    const refund = checkoutIssue("organizerEventOfferPayments", "op", {
      status: "refundPending", amountPaise: 50_000,
      updatedAt: at(now - 2 * 86_400_000)}, now);
    assert.equal(refund?.kind, "refund");
    assert.equal(refund?.canConfirmBooking, false);
    assert.equal(checkoutIssue("organizerEventOfferPayments", "op", {
      status: "refundPending", updatedAt: at(now - 60_000)}, now), null);
    assert.equal(checkoutIssue("publicEventPayments", "p", {
      status: "reviewRequired", amountPaise: 100, updatedAt: at(1)}, now)?.kind,
    "review");
    assert.equal(checkoutIssue("publicEventPayments", "p", {
      status: "admitted"}, now), null);
  });

test("native and bill issues", () => {
  assert.equal(nativeIssue("pay_9", {signUpFailed: true, amount: 30_000,
    status: "completed", eventId: "ev"})?.kind, "payment");
  assert.equal(nativeIssue("pay_9", {status: "refundFailed"})?.kind,
    "refund");
  assert.equal(nativeIssue("pay_9", {status: "completed"}), null);
  const bill = {status: "sent", dueAtMillis: now - 1, billId: "lantern_2026-10",
    organizerId: "lantern", organizerName: "Lantern Lane Social",
    month: "2026-10", totalMinor: 640_000, invoiceNumber: "2026-27/031"};
  const issue = billIssue(bill as never, now);
  assert.equal(issue?.subtitle, "2026-10 · ₹6,400 · 2026-27/031");
  assert.equal(billIssue({...bill, dueAtMillis: now + 1} as never, now), null);
  assert.match(resolutionId("publicEventPayments:pp_1"), /^[A-Za-z0-9_-]+$/u);
});
