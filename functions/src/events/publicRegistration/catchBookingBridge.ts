import * as admin from "firebase-admin";
import type {EventDocument, UserProfileDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {
  eventParticipationId,
  eventParticipationPatch,
} from "../../shared/relationshipDocuments";
import {
  activityNotificationId,
  eventActivityNotificationCopy,
  setActivityNotificationInTransaction,
} from "../../shared/notifications";
import {cohortIdForUser, decrementCount, incrementCount} from "../eventPolicy";
import {registrationUnavailable} from "./policy";

const PUBLIC_PAYMENT_PREFIX = "pp_";

type Participation = {
  status?: string;
  paymentId?: string | null;
  genderAtSignup?: string | null;
  cohortAtSignup?: string | null;
};

/** A Consumer booking whose seat and money belong to an organizer-routed
 * public payment rather than to Catch's native checkout.
 */
export function isPublicPaymentBooking(
  paymentId: unknown,
  expectedPaymentId?: string,
): boolean {
  return typeof paymentId === "string" &&
    paymentId.startsWith(PUBLIC_PAYMENT_PREFIX) &&
    (expectedPaymentId === undefined || paymentId === expectedPaymentId);
}

/** Reads, inside the admission transaction, what the Consumer app needs to
 * show an organizer-routed paid admission as its own booking. Website-only
 * guests have no Catch profile, so their roster row remains the whole booking.
 */
export async function prepareCatchBookingAdmission(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  uid: string;
  paymentId: string;
}) {
  const {db, tx, eventId, uid, paymentId} = input;
  const participationRef = db.collection("eventParticipations")
    .doc(eventParticipationId(eventId, uid));
  const [userSnap, participationSnap] = await Promise.all([
    tx.get(db.collection("users").doc(uid)),
    tx.get(participationRef),
  ]);
  if (!userSnap.exists) return null;
  const user = userSnap.data() as UserProfileDocument;
  const existing = participationSnap.data() as Participation | undefined;
  // The seat snapshot already proved this UID holds no active seat. An active
  // edge without one is drift that must not be silently overwritten.
  if (["signedUp", "attended"].includes(existing?.status ?? "")) {
    registrationUnavailable("Existing Catch booking needs reconciliation.");
  }
  const gender = typeof user.gender === "string" && user.gender ?
    user.gender : null;
  const cohortId = cohortIdForUser(user);
  const wasWaitlisted = existing?.status === "waitlisted";
  return {
    eventCounts(event: EventDocument): Record<string, unknown> {
      return {
        ...(gender ? {[`genderCounts.${gender}`]:
          admin.firestore.FieldValue.increment(1)} : {}),
        cohortCounts: incrementCount(event.cohortCounts ?? {}, cohortId),
        ...(wasWaitlisted ? {
          waitlistedCount: admin.firestore.FieldValue.increment(-1),
          waitlistedCohortCounts: decrementCount(
            event.waitlistedCohortCounts ?? {},
            existing?.cohortAtSignup ?? cohortId,
          ),
        } : {}),
      };
    },
    apply(event: EventDocument): void {
      const organizerId = event.organizerId ?? event.clubId;
      tx.set(participationRef, eventParticipationPatch({
        exists: participationSnap.exists,
        eventId,
        clubId: event.clubId,
        organizerId,
        uid,
        status: "signedUp",
        genderAtSignup: gender ?? undefined,
        cohortAtSignup: cohortId,
        paymentId,
      }), {merge: true});
      const copy = eventActivityNotificationCopy("eventSignup", event);
      setActivityNotificationInTransaction(tx, db, {
        id: activityNotificationId("eventSignup", eventId),
        uid,
        type: "eventSignup",
        title: copy.title,
        body: copy.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        eventId,
        clubId: event.clubId,
        organizerId,
      });
    },
  };
}

/** The Consumer edge and event counts released by a guest cancelling an
 * organizer-routed paid admission. A host-cancelled event keeps its edges,
 * matching native bookings on cancelled events.
 */
export function catchBookingCancellation(input: {
  tx: FirebaseFirestore.Transaction;
  participationRef: FirebaseFirestore.DocumentReference;
  participation: Participation;
  event: EventDocument;
  eventId: string;
  uid: string;
}): Record<string, unknown> {
  const {tx, participationRef, participation, event, eventId, uid} = input;
  tx.set(participationRef, eventParticipationPatch({
    exists: true,
    eventId,
    clubId: event.clubId,
    organizerId: event.organizerId ?? event.clubId,
    uid,
    status: "cancelled",
  }), {merge: true});
  const gender = participation.genderAtSignup;
  return {
    ...(gender ? {[`genderCounts.${gender}`]:
      Math.max(0, (event.genderCounts?.[gender] ?? 1) - 1)} : {}),
    ...(participation.cohortAtSignup ? {cohortCounts: decrementCount(
      event.cohortCounts ?? {}, participation.cohortAtSignup)} : {}),
  };
}
