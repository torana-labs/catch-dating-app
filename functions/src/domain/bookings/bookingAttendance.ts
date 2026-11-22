/**
 * Bookings-owned attendance for Catch bookings. Callers that confirm a guest
 * arrived (a signed venue session, a First Hello mission) decide whether the
 * guest may check in; this module owns what checking in writes: the booking's
 * attended status, its roster row and the event's checked-in counter.
 */

import * as admin from "firebase-admin";
import type {EventBookingDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {eventParticipationPatch} from "../../shared/relationshipDocuments";
import {
  loadVerifiedRosterPhone,
  participationAfterPatch,
  readCatchBookingRoster,
  writeCatchBookingRoster,
} from "../../events/catchBookingRoster";

/** Reads done; `apply` stages the attendance writes in the same transaction. */
export interface PreparedBookingAttendance {
  /**
   * Marks the booking attended, writes its roster row and adds one to the
   * event's checked-in counter. Call after every transaction read, only for a
   * stored booking the caller has checked is signed up and not yet attended.
   * @param {object} params The booking as read in this transaction and the
   *   event's organizer.
   */
  apply(params: {
    bookingSnap: FirebaseFirestore.DocumentSnapshot;
    organizerId: string;
  }): void;
}

/**
 * Reads the account's roster slot so a later `apply` can mark the booking
 * attended. Runs inside the caller's transaction; opens none of its own.
 * @param {object} params Transaction, event and Catch account.
 * @return {Promise<PreparedBookingAttendance>} The staged attendance write.
 */
export async function prepareMarkBookingAttended(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  uid: string;
  /** Test seam for the verified Auth phone lookup. */
  verifiedPhone?: () => Promise<string | null>;
}): Promise<PreparedBookingAttendance> {
  const {db, tx, eventId, uid} = params;
  const slot = await readCatchBookingRoster({db, tx, eventId, uid,
    verifiedPhone: params.verifiedPhone ??
      (() => loadVerifiedRosterPhone(uid))});
  return {
    apply: ({bookingSnap, organizerId}) => {
      const booking = bookingSnap.data() as
        Partial<EventBookingDocument> | undefined;
      tx.update(db.collection("events").doc(eventId), {
        checkedInCount: admin.firestore.FieldValue.increment(1),
      });
      const attendance = eventParticipationPatch({
        exists: bookingSnap.exists,
        eventId,
        organizerId,
        uid,
        status: "attended",
        genderAtSignup: booking?.genderAtSignup ?? undefined,
        cohortAtSignup: booking?.cohortAtSignup ?? undefined,
        paymentId: booking?.paymentId ?? undefined,
      });
      tx.set(slot.bookingRef, attendance, {merge: true});
      writeCatchBookingRoster({db, tx, slot,
        booking: participationAfterPatch(bookingSnap.data(), attendance),
        now: admin.firestore.Timestamp.now()});
    },
  };
}
