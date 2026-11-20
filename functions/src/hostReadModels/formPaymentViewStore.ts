import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  HostFormPaymentViewDocument,
  OrganizerFormPaymentDocument,
} from "../shared/generated/firestoreAdminTypes";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {projectLedgerRow} from "../payments/formPayments/formPaymentLedger";

export const hostFormPaymentViewsCollection = "hostFormPaymentViews";

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Reads one form fee payment's view from the ledger inside a transaction,
 * without writing, or null when the document is absent, is another kind of
 * checkout, or has no organizer or form. The row is exactly what
 * listOrganizerFormPayments returns for it: no answers, respondent identity,
 * connection, account or hashes.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} paymentId The guestPayments id.
 * @return {Promise<HostFormPaymentViewDocument|null>} The view.
 */
export async function readHostFormPaymentView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  paymentId: string): Promise<HostFormPaymentViewDocument | null> {
  const snapshot = await tx.get(db.collection(GUEST_PAYMENTS).doc(paymentId));
  const payment = snapshot.data() as
    (OrganizerFormPaymentDocument & {purpose?: unknown}) | undefined;
  if (!payment || payment.purpose !== "form" ||
      !nonEmpty(payment.organizerId) || !nonEmpty(payment.formId)) {
    return null;
  }
  const row = projectLedgerRow(paymentId, payment);
  return {organizerId: payment.organizerId, paymentId,
    formId: payment.formId, status: row.status,
    createdAtMillis: row.createdAtMillis, row, version: 1};
}

/**
 * Rewrites one form fee payment's view from the ledger, writing only on
 * change, and removes it when the document is gone or is not a form fee. A
 * payment that fails its contract is logged and keeps its previous view
 * rather than blocking a trigger retry loop; the nightly data validation
 * reports the document.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} paymentId The guestPayments id.
 * @return {Promise<void>} Resolves once the view matches the ledger.
 */
export async function reconcileFormPaymentView(
  db: FirebaseFirestore.Firestore, paymentId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostFormPaymentViewsCollection).doc(paymentId);
    const old = await tx.get(ref);
    let next: HostFormPaymentViewDocument | null;
    try {
      next = await readHostFormPaymentView(db, tx, paymentId);
    } catch (error) {
      logger.warn("Form payment view kept a payment that fails its contract.",
        {paymentId,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
