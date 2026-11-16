import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {validatePublicEventAdmissionReceiptDocument} from
  "../../shared/generated/validators/publicEventAdmissionReceiptDocument";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import {
  PUBLIC_ADMISSION_COLLECTION,
  publicAdmissionId,
} from "./paymentLedger";
import {registrationUnavailable} from "./policy";

/** Immutable source-specific financial proof, not current seat authority. */
export function assertPublicPaidAdmission(
  payment: Payment,
  paymentId: string,
  raw: unknown,
): { attendeeId: string } {
  if (
    !validatePublicEventAdmissionReceiptDocument(raw) ||
    payment.admissionReceiptId !== publicAdmissionId(paymentId) ||
    raw.paymentId !== paymentId ||
    raw.organizerId !== payment.organizerId ||
    raw.eventId !== payment.eventId ||
    raw.recipientUid !== payment.recipientUid ||
    raw.attendeeId !== payment.attendeeId ||
    raw.canonicalSeatKey !== payment.canonicalSeatKey ||
    raw.identityRevision !== payment.identityRevision ||
    raw.migrationRevision !== payment.migrationRevision ||
    raw.registrationRevision !== payment.registrationRevision ||
    raw.amountPaise !== payment.amountPaise ||
    (raw.placeCount ?? 1) !== (payment.placeCount ?? 1) ||
    raw.currency !== payment.currency ||
    raw.providerOrderId !== payment.providerOrderId ||
    raw.providerPaymentId !== payment.providerPaymentId ||
    raw.admittedAtMillis !== payment.admittedAt?.toMillis() ||
    canonicalJson(raw.routing) !== canonicalJson(payment.routing)
  ) {
    registrationUnavailable("Paid admission proof needs reconciliation.");
  }
  return {attendeeId: raw.attendeeId};
}

export async function readPublicPaidAdmission(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  payment: Payment;
  paymentId: string;
}): Promise<{ attendeeId: string }> {
  const {db, tx, payment, paymentId} = input;
  const receipt = await tx.get(
    db
      .collection(PUBLIC_ADMISSION_COLLECTION)
      .doc(publicAdmissionId(paymentId)),
  );
  return assertPublicPaidAdmission(payment, paymentId, receipt.data());
}
