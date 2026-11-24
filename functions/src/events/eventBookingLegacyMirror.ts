import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";

/**
 * TRANSITIONAL (phase 1 of the eventParticipations -> eventBookings rename,
 * Nov 2026). Remove in phase 2, once the Host and guest releases that read
 * eventBookings are live and their minimum versions are raised.
 *
 * eventBookings/{eventId_uid} is the one record of a guest's Catch booking.
 * Released app builds (Host 1.0.5 and the guest beta) still read the old
 * eventParticipations collection directly, so this keeps a read-only copy
 * there with the same id and the same document. Nothing else writes
 * eventParticipations, and no trigger listens to it.
 */
const EVENT_BOOKINGS = "eventBookings";
const LEGACY_EVENT_PARTICIPATIONS = "eventParticipations";

/**
 * Copies the booking's current state to its legacy mirror, or deletes the
 * mirror when the booking is gone. It reads the booking again inside a
 * transaction instead of trusting the event payload, so late or repeated
 * deliveries converge on the latest booking.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} bookingId The booking document id (eventId_uid).
 * @return {Promise<"mirrored" | "deleted">} What the mirror now holds.
 */
export async function mirrorEventBookingToLegacy(
  db: FirebaseFirestore.Firestore,
  bookingId: string
): Promise<"mirrored" | "deleted"> {
  const bookingRef = db.collection(EVENT_BOOKINGS).doc(bookingId);
  const mirrorRef = db.collection(LEGACY_EVENT_PARTICIPATIONS).doc(bookingId);
  return db.runTransaction(async (tx) => {
    const booking = await tx.get(bookingRef);
    const data = booking.data();
    if (!booking.exists || data === undefined) {
      tx.delete(mirrorRef);
      return "deleted";
    }
    tx.set(mirrorRef, data);
    return "mirrored";
  });
}

export const onEventBookingMirroredToLegacy = onDocumentWritten({
  document: `${EVENT_BOOKINGS}/{bookingId}`,
  retry: true,
}, async (event) => {
  await mirrorEventBookingToLegacy(admin.firestore(), event.params.bookingId);
});
