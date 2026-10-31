import {formAdmissionOwnershipId} from
  "../organizerFormAdmission/admissionService";
import {validateOrganizerEventOfferRecipientDocument} from
  "../shared/generated/validators/organizerEventOfferRecipientDocument";
import {validateOrganizerFormAdmissionReceiptDocument} from
  "../shared/generated/validators/organizerFormAdmissionReceiptDocument";
import {validateOrganizerFormAdmissionDocument} from
  "../shared/generated/validators/organizerFormAdmissionDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";

/** Owned admission remains recoverable after its invitation expires. */
export async function findRecipientAdmission(
  db: FirebaseFirestore.Firestore, uid: string, grantId: string,
): Promise<{eventId: string; attendeeId: string} | undefined> {
  return db.runTransaction(async (tx) => {
    const read = async (collection: string, id: string) =>
      (await tx.get(db.collection(collection).doc(id))).data();
    const grant = await read("organizerEventOfferRecipients", grantId);
    if (!validateOrganizerEventOfferRecipientDocument(grant) ||
        grant.recipientUid !== uid) return undefined;
    const ownership = await read("organizerFormAdmissions",
      formAdmissionOwnershipId(grant.organizerId, grant.eventId,
        grant.responseId));
    if (!validateOrganizerFormAdmissionDocument(ownership) ||
        ownership.eventId !== grant.eventId ||
        ownership.organizerId !== grant.organizerId ||
        ownership.responseId !== grant.responseId ||
        ownership.offerId !== grant.offerId) return undefined;
    const [receipt, attendee] = await Promise.all([
      read("organizerFormAdmissionReceipts", ownership.receiptId),
      read("eventAttendees", ownership.attendeeId),
    ]);
    if (!validateOrganizerFormAdmissionReceiptDocument(receipt) ||
        receipt.paymentSnapshot.expectedAmountMinor !== 0 ||
        receipt.receiptId !== ownership.receiptId ||
        receipt.eventId !== grant.eventId ||
        receipt.organizerId !== grant.organizerId ||
        receipt.responseId !== grant.responseId ||
        receipt.offerId !== grant.offerId ||
        receipt.attendeeId !== ownership.attendeeId ||
        !validateEventAttendeeDocument(attendee) ||
        attendee.linkedUid !== uid || attendee.eventId !== grant.eventId ||
        (attendee.organizerId) !== grant.organizerId ||
        !["registered", "checkedIn"].includes(attendee.status)) {
      return undefined;
    }
    return {eventId: grant.eventId, attendeeId: ownership.attendeeId};
  });
}
