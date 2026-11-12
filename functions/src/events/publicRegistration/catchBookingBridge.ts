import * as admin from "firebase-admin";
import {type CatchBookingRosterSlot, participationAfterPatch,
  readCatchBookingRoster, writeCatchBookingRoster} from "../catchBookingRoster";
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
  /** The web registration's roster row: the same guest's row. */
  attendeeId: string;
}) {
  const {db, tx, eventId, uid, paymentId} = input;
  const participationRef = db.collection("eventParticipations")
    .doc(eventParticipationId(eventId, uid));
  const [userSnap, participationSnap, rosterSlot] = await Promise.all([
    tx.get(db.collection("users").doc(uid)),
    tx.get(participationRef),
    readCatchBookingRoster({db, tx, eventId, uid,
      attendeeId: input.attendeeId}),
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
      const organizerId = event.organizerId;
      const admission = eventParticipationPatch({
        exists: participationSnap.exists,
        eventId,
        organizerId,
        uid,
        status: "signedUp",
        genderAtSignup: gender ?? undefined,
        cohortAtSignup: cohortId,
        paymentId,
      });
      tx.set(participationRef, admission, {merge: true});
      // The admission writes the web row itself; it gains only the booking
      // facts and the pointer here.
      writeCatchBookingRoster({db, tx, slot: rosterSlot,
        booking: participationAfterPatch(participationSnap.data(), admission),
        now: admin.firestore.Timestamp.now(), factsOnly: true});
      const copy = eventActivityNotificationCopy("eventSignup", event);
      setActivityNotificationInTransaction(tx, db, {
        id: activityNotificationId("eventSignup", eventId),
        uid,
        type: "eventSignup",
        title: copy.title,
        body: copy.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        eventId,
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
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  rosterSlot: CatchBookingRosterSlot;
  participationRef: FirebaseFirestore.DocumentReference;
  participation: Participation;
  event: EventDocument;
  eventId: string;
  uid: string;
}): Record<string, unknown> {
  const {tx, participationRef, participation, event, eventId, uid} = input;
  const cancellation = eventParticipationPatch({
    exists: true,
    eventId,
    organizerId: event.organizerId,
    uid,
    status: "cancelled",
  });
  tx.set(participationRef, cancellation, {merge: true});
  writeCatchBookingRoster({db: input.db, tx, slot: input.rosterSlot,
    booking: participationAfterPatch(participation, cancellation),
    now: admin.firestore.Timestamp.now(), factsOnly: true});
  const gender = participation.genderAtSignup;
  return {
    ...(gender ? {[`genderCounts.${gender}`]:
      Math.max(0, (event.genderCounts?.[gender] ?? 1) - 1)} : {}),
    ...(participation.cohortAtSignup ? {cohortCounts: decrementCount(
      event.cohortCounts ?? {}, participation.cohortAtSignup)} : {}),
  };
}
