import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {reconcileFormPaymentView} from "./formPaymentViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

/**
 * A form fee payment's view follows its ledger document. Other checkouts in
 * the shared ledger (bookings, website and offer payments) have no view and
 * return without a read.
 */
export const onHostFormPaymentViewPaymentChanged = onDocumentWritten({
  retry: true, document: `${GUEST_PAYMENTS}/{paymentId}`,
}, async (event) => {
  const before = event.data?.before.get("purpose");
  const after = event.data?.after.get("purpose");
  if (before !== "form" && after !== "form") return;
  await reconcileFormPaymentView(admin.firestore(), event.params.paymentId);
});

/**
 * A form fee payment: its ledger row view.
 * dispatchGuestPayments (issue #2451) runs the same work; both run until the
 * old trigger retires, which is safe because it re-reads its sources,
 * so a retry, a replay or a second run converges.
 */
export const hostFormPaymentViewProjections = defineProjections(
  "guestPayments", [{
    id: "hostFormPaymentView", kind: "projection",
    when: ({before, after}) => before?.purpose === "form" ||
      after?.purpose === "form",
    run: (change, ctx) => reconcileFormPaymentView(ctx.db, change.documentId),
  }]);
