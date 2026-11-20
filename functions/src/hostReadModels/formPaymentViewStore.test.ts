import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {reconcileFormPaymentView} from "./formPaymentViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);
const paymentId = `fp_${"a".repeat(32)}`;

function payment(overrides: Record<string, unknown> = {}) {
  return {purpose: "form", organizerId: "org", formId: "form-1",
    versionId: "version-1", draftId: "draft-1", respondentUid: "guest-1",
    connectionId: "connection-1", accountId: "acc_private", mode: "live",
    draftRevision: 2, answersHash: "b".repeat(64),
    identity: {name: "Asha Rao", email: "asha@example.com",
      phone: "+919800000000"},
    amountPaise: 50_000, currency: "INR", description: "Trail day",
    refundPolicy: "none", receipt: "rcpt_1", status: "submitted",
    providerOrderId: "order_1", providerPaymentId: "pay_1",
    providerRefundId: null, refundedAmountPaise: 0, responseId: "response-1",
    createdAt: at(1_000), updatedAt: at(3_000), capturedAt: at(2_000),
    submittedAt: at(3_000), ...overrides};
}

test("a form fee view is the ledger row and nothing about the guest",
  async () => {
    const db = new AudienceTestStore({
      [`guestPayments/${paymentId}`]: payment()});
    await reconcileFormPaymentView(db.asFirestore(), paymentId);
    assert.deepEqual(db.docs[`hostFormPaymentViews/${paymentId}`], {
      organizerId: "org", paymentId, formId: "form-1", status: "submitted",
      createdAtMillis: 1_000, version: 1,
      row: {paymentId, status: "submitted", mode: "live", amountPaise: 50_000,
        currency: "INR", refundedAmountPaise: 0, createdAtMillis: 1_000,
        updatedAtMillis: 3_000, capturedAtMillis: 2_000,
        submittedAtMillis: 3_000, responseId: "response-1",
        providerOrderId: "order_1", providerPaymentId: "pay_1",
        providerRefundId: null, receipt: "rcpt_1"}});
    const view = JSON.stringify(db.docs[`hostFormPaymentViews/${paymentId}`]);
    for (const secret of ["Asha", "asha@", "+9198", "acc_private",
      "connection-1", "guest-1", "draft-1", "bbbb"]) {
      assert.equal(view.includes(secret), false, secret);
    }
  });

test("other checkouts get no view and a refund updates the row",
  async () => {
    const booking = "pay_booking";
    const db = new AudienceTestStore({
      [`guestPayments/${paymentId}`]: payment(),
      [`guestPayments/${booking}`]: {purpose: "booking", userId: "guest-1"},
    });
    await reconcileFormPaymentView(db.asFirestore(), booking);
    assert.equal(db.docs[`hostFormPaymentViews/${booking}`], undefined);
    await reconcileFormPaymentView(db.asFirestore(), paymentId);
    const first = db.docs[`hostFormPaymentViews/${paymentId}`];
    await reconcileFormPaymentView(db.asFirestore(), paymentId);
    assert.equal(db.docs[`hostFormPaymentViews/${paymentId}`], first);
    db.docs[`guestPayments/${paymentId}`] = payment({status: "refunded",
      refundedAmountPaise: 50_000, providerRefundId: "rfnd_1",
      updatedAt: at(9_000)});
    await reconcileFormPaymentView(db.asFirestore(), paymentId);
    const view = db.docs[`hostFormPaymentViews/${paymentId}`];
    assert.equal(view.status, "refunded");
    assert.equal((view.row as Record<string, unknown>).providerRefundId,
      "rfnd_1");
    delete db.docs[`guestPayments/${paymentId}`];
    await reconcileFormPaymentView(db.asFirestore(), paymentId);
    assert.equal(db.docs[`hostFormPaymentViews/${paymentId}`], undefined);
  });
