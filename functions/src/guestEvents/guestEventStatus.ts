import {HttpsError} from "firebase-functions/v2/https";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {assertUnpartitionedAdmission} from
  "../organizerFormAdmission/admissionEligibility";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {validateEventParticipationDocument} from
  "../shared/generated/validators/eventParticipationDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {validateOrganizerApplicationDocument} from
  "../shared/generated/validators/organizerApplicationDocument";
import type {EventAttendeeDocument, EventDocument,
  EventParticipationDocument, GuestEventStatusDocument,
  OrganizerApplicationDocument} from "../shared/generated/firestoreAdminTypes";
import {organizerApplicationAccess} from
  "../organizers/organizerApplicationAccess";
import {readVerifiedOfferRecipient, type LoadRecipientAuth} from
  "../organizerEventOfferRecipients/recipientGrant";
import {projectPublicPayment} from "../events/publicRegistration/projection";
import {sameExceptClock} from "./eventGuestEntry";
import {guestEventCard} from "./guestEventCard";

/**
 * guestEventStatuses/{eventId}_{uid}: what one guest's own records say about
 * one event — their Catch booking, roster place, website or offer payment,
 * application and offer invitation — rebuilt from those records whenever one
 * of them changes. A guest with no such record has no row. Only the guest
 * reads it: never CRM notes, answers, phone numbers or invitation tokens.
 * The website's event page reads it with the event's eventGuestEntries
 * document and decides the guest's next step in the browser. Booking,
 * checkout, application and offer commands keep reading the authoritative
 * documents; this row grants nothing.
 */
export const guestEventStatuses = "guestEventStatuses";

export const guestEventStatusId = (eventId: string, uid: string) =>
  `${eventId}_${uid}`;

export type GuestEventStatus = GuestEventStatusDocument;

const closedPayment = ["expired", "failed", "cancelled", "refunded"];

/**
 * One guest's status for one event from current authority, or null when they
 * have no record of their own there, the event is missing or the account is
 * deleted.
 * @param {object} params Inputs.
 * @param {FirebaseFirestore.Firestore} params.db Firestore.
 * @param {FirebaseFirestore.Transaction} params.tx The reading transaction.
 * @param {string} params.eventId The event.
 * @param {string} params.uid The guest.
 * @param {number} params.nowMillis The clock.
 * @param {LoadRecipientAuth} params.loadCurrentAuthUser Admin Auth reader,
 * for the offer invitation's phone binding.
 * @return {Promise<GuestEventStatus | null>} The row.
 */
export async function guestEventStatus(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  eventId: string; uid: string; nowMillis: number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<GuestEventStatus | null> {
  const {db, tx, eventId, uid, nowMillis} = params;
  const [eventSnap, deleted] = await Promise.all([
    tx.get(db.collection("events").doc(eventId)),
    tx.get(db.collection("deletedUsers").doc(uid)),
  ]);
  const event = eventSnap.data() as EventDocument | undefined;
  if (!event || deleted.exists || typeof event.organizerId !== "string") {
    return null;
  }
  const organizerId = event.organizerId;
  const [attendees, payments, applications, grants, native, offerPayments] =
    await Promise.all([
      tx.get(db.collection("eventAttendees").where("eventId", "==", eventId)
        .where("linkedUid", "==", uid).limit(2)),
      tx.get(db.collection(GUEST_PAYMENTS)
        .where("purpose", "==", "publicEvent")
        .where("eventId", "==", eventId).where("recipientUid", "==", uid)
        .orderBy("createdAt", "desc").limit(1)),
      tx.get(db.collection("organizerApplications")
        .where("linkedUid", "==", uid).where("targetId", "==", eventId)
        .orderBy("submittedAt", "desc").limit(1)),
      tx.get(db.collection("organizerEventOfferRecipients")
        .where("recipientUid", "==", uid).where("eventId", "==", eventId)
        .limit(21)),
      tx.get(db.collection("eventParticipations")
        .doc(eventParticipationId(eventId, uid))),
      tx.get(db.collection(GUEST_PAYMENTS)
        .where("purpose", "==", "offer")
        .where("eventId", "==", eventId).where("recipientUid", "==", uid)
        .orderBy("createdAt", "desc").limit(1)),
    ]);
  const row: GuestEventStatus = {schemaVersion: 1, eventId, uid, organizerId,
    booking: "none", ambiguous: false, runtimeId: null,
    publicPaymentId: null, paymentRecoverable: false,
    offerPaymentId: offerPayments.docs[0]?.id ?? null,
    offerGrantId: null, offerExpiresAtMillis: null, offerAdmissible: false,
    offerAmbiguous: false, applicationStatus: null,
    participationStatus: null, eventCard: null,
    updatedAtMillis: nowMillis};
  const participation = native.data() as EventParticipationDocument |
    undefined;
  if (participation && validateEventParticipationDocument(participation) &&
      participation.eventId === eventId && participation.uid === uid &&
      participation.organizerId === organizerId) {
    if (participation.status !== "deleted") {
      row.participationStatus = participation.status;
    }
    if (["signedUp", "attended"].includes(participation.status)) {
      row.booking = "registered";
    }
  }
  if (attendees.size > 1 || grants.size > 20) {
    // Only the Catch booking and an offer payment are certain; the website
    // shows the rest as unavailable, as the old guest read did.
    row.ambiguous = true;
    return finish(row, event);
  }
  const attendee = attendees.docs[0]?.data() as EventAttendeeDocument |
    undefined;
  if (attendee && (!validateEventAttendeeDocument(attendee) ||
      attendee.eventId !== eventId || attendee.linkedUid !== uid ||
      attendee.organizerId !== organizerId)) {
    row.ambiguous = true;
    return finish(row, event);
  }
  // A Catch booking governs admission; its roster row is the Host's view of
  // it, not roster admission.
  if (attendee && attendee.source !== "catchBooking" &&
      row.booking !== "registered") {
    if (["registered", "checkedIn"].includes(attendee.status)) {
      row.booking = "registered";
    } else if (attendee.status === "waitlisted") row.booking = "waitlisted";
  }
  if (payments.docs[0]) {
    const paid = await projectPublicPayment({db, tx, uid, eventId,
      organizerId, paymentId: payments.docs[0].id, nowMillis,
      includeCheckout: false});
    row.publicPaymentId = payments.docs[0].id;
    if (paid.admission) {
      row.booking = "registered";
    } else if (paid.payment && !closedPayment.includes(paid.payment.status)) {
      row.paymentRecoverable = true;
    }
  }
  if (row.booking === "registered") row.paymentRecoverable = false;
  const application = applications.docs[0]?.data() as
    OrganizerApplicationDocument | undefined;
  if (application && validateOrganizerApplicationDocument(application) &&
      application.organizerId === organizerId &&
      application.targetKind === "event" &&
      application.targetId === eventId && application.linkedUid === uid) {
    const access = await organizerApplicationAccess({db, transaction: tx,
      applicationId: applications.docs[0].id, application});
    row.applicationStatus =
      access.accessState === "revokedParticipantGrant" ?
        "withdrawn" : application.reviewStatus;
  }
  // Claimed invitations are recoverable without keeping secret invitation
  // URLs. An unclaimed one still needs the original recipient-bound handoff.
  let offerScope: string | null = null;
  let issuedAt = -1;
  for (const grant of grants.docs) {
    try {
      const current = await readVerifiedOfferRecipient({db, tx, uid,
        grantId: grant.id, nowMillis,
        loadCurrentAuthUser: params.loadCurrentAuthUser});
      if (current.source.offer.paymentSnapshot.expectedAmountMinor !== 0 &&
          current.source.offer.paymentSnapshot.collectionMode !==
            "catchCheckout") continue;
      const key = [current.grant.offerId, current.grant.offerGeneration,
        current.grant.offerRevision].join(":");
      if (offerScope && offerScope !== key) {
        row.offerAmbiguous = true;
        row.offerGrantId = null;
        row.offerExpiresAtMillis = null;
        break;
      }
      offerScope = key;
      if (current.grant.issuedAtMillis > issuedAt) {
        issuedAt = current.grant.issuedAtMillis;
        row.offerGrantId = grant.id;
        row.offerExpiresAtMillis = current.grant.expiresAtMillis;
      }
    } catch (error) {
      if (!(error instanceof HttpsError) ||
          error.code !== "failed-precondition") throw error;
    }
  }
  return finish(row, event);
}

/**
 * Adds the event-derived parts of the row (its runtime, offer admission and
 * list card), and drops a row that records nothing of the guest's own. A
 * Catch booking in any status keeps the row, so the guest's booking lists
 * read only their own rows.
 * @param {GuestEventStatus} row The guest's facts.
 * @param {EventDocument} event The event.
 * @return {GuestEventStatus | null} The row, if any.
 */
function finish(row: GuestEventStatus, event: EventDocument):
    GuestEventStatus | null {
  row.eventCard = guestEventCard(row.eventId, event);
  if (row.booking === "registered" && event.runtimeAccess?.enabled === true) {
    row.runtimeId = event.runtimeAccess.publicRuntimeId ?? null;
  }
  try {
    assertUnpartitionedAdmission(event);
    row.offerAdmissible = true;
  } catch {
    row.offerAdmissible = false;
  }
  const empty = row.booking === "none" && !row.ambiguous &&
    row.publicPaymentId === null && row.offerPaymentId === null &&
    row.offerGrantId === null && !row.offerAmbiguous &&
    row.applicationStatus === null && row.participationStatus === null;
  return empty ? null : row;
}

/**
 * Rebuilds one guest's row for one event; a guest with no record of their
 * own there has none. Every call reads current state, so out-of-order
 * triggers converge, and an unchanged row is not rewritten.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event.
 * @param {string} uid The guest.
 * @param {number} nowMillis The clock.
 * @return {Promise<"written" | "unchanged" | "removed">} What happened.
 */
export async function refreshGuestEventStatus(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string,
  nowMillis = Date.now(),
): Promise<"written" | "unchanged" | "removed"> {
  const ref = db.collection(guestEventStatuses)
    .doc(guestEventStatusId(eventId, uid));
  return db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const row = await guestEventStatus({db, tx, eventId, uid, nowMillis});
    if (row === null) {
      if (current.exists) tx.delete(ref);
      return "removed" as const;
    }
    if (current.exists && sameExceptClock(current.data(), row)) {
      return "unchanged" as const;
    }
    tx.set(ref, row);
    return "written" as const;
  });
}
