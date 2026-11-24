import * as admin from "firebase-admin";

/**
 * Server-only admission facts for one Catch booking, at
 * eventBookingPrivateFacts/{eventId}_{uid} (the booking's own id).
 *
 * A booking cohort encodes the guest's gender and who they are interested
 * in, which is their sexual orientation. Organisers read eventBookings and
 * eventWaitlistOffers, so no cohort is stored there (#2493). The seat counters
 * still need the exact cohort a booking was counted under (cohortAtSignup)
 * and the one a waitlist offer reserves (cohortAtOffer), so both are kept
 * here, where no client and no organiser can read them.
 */
export const BOOKING_PRIVATE_FACTS = "eventBookingPrivateFacts";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
export type CohortField = "cohortAtSignup" | "cohortAtOffer";

/**
 * The private facts document of one booking.
 * @param {Db} db Firestore.
 * @param {string} bookingId The booking id ({eventId}_{uid}).
 * @return {FirebaseFirestore.DocumentReference} The document.
 */
export function bookingPrivateFactsRef(db: Db, bookingId: string):
  FirebaseFirestore.DocumentReference {
  return db.collection(BOOKING_PRIVATE_FACTS).doc(bookingId);
}

/**
 * The cohort a stored private facts document records, if it is valid.
 * @param {unknown} data The document data.
 * @param {string} eventId The booking's event.
 * @param {string} uid The booking's guest.
 * @param {CohortField} field Which cohort to read.
 * @return {string | undefined} The cohort id.
 */
export function storedBookingCohort(data: unknown, eventId: string,
  uid: string, field: CohortField = "cohortAtSignup"): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const value = data as Record<string, unknown>;
  if (value.eventId !== eventId || value.uid !== uid) return undefined;
  return nonEmpty(value[field]);
}

/**
 * Reads the cohort a booking was counted under, inside a transaction. Bookings
 * written before #2493 kept it on the booking itself; that copy is honoured
 * until the move-booking-cohorts tool has cleared it.
 * @param {object} params Transaction, booking identity and stored booking.
 * @return {Promise<string | undefined>} The cohort id, when known.
 */
export async function readBookingCohort(params: {
  db: Db;
  tx: Tx;
  eventId: string;
  uid: string;
  booking?: unknown;
}): Promise<string | undefined> {
  const snap = await params.tx.get(bookingPrivateFactsRef(params.db,
    `${params.eventId}_${params.uid}`));
  return storedBookingCohort(snap.data(), params.eventId, params.uid) ??
    legacyBookingCohort(params.booking);
}

/**
 * Reads the cohorts of several bookings of one event outside a transaction.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {Array<{uid: string, booking?: unknown}>} bookings The bookings.
 * @return {Promise<Map<string, string>>} Cohort id by guest uid.
 */
export async function fetchBookingCohorts(db: Db, eventId: string,
  bookings: Array<{uid: string; booking?: unknown}>):
  Promise<Map<string, string>> {
  const cohorts = new Map<string, string>();
  if (bookings.length === 0) return cohorts;
  const snaps = await Promise.all(bookings.map((entry) =>
    bookingPrivateFactsRef(db, `${eventId}_${entry.uid}`).get()));
  snaps.forEach((snap, index) => {
    const {uid, booking} = bookings[index];
    const cohort = storedBookingCohort(snap.data(), eventId, uid) ??
      legacyBookingCohort(booking);
    if (cohort) cohorts.set(uid, cohort);
  });
  return cohorts;
}

/**
 * Records the cohort a booking is counted under, or the one a waitlist offer
 * reserves. Call after every read of the transaction, beside the booking or
 * offer write. Other recorded facts are kept.
 * @param {object} params Transaction, booking identity and cohort.
 */
export function writeBookingCohort(params: {
  db: Db;
  tx: Tx;
  eventId: string;
  uid: string;
  cohortAtSignup?: string;
  cohortAtOffer?: string;
}): void {
  params.tx.set(bookingPrivateFactsRef(params.db,
    `${params.eventId}_${params.uid}`), {
    eventId: params.eventId,
    uid: params.uid,
    ...(params.cohortAtSignup === undefined ? {} :
      {cohortAtSignup: params.cohortAtSignup}),
    ...(params.cohortAtOffer === undefined ? {} :
      {cohortAtOffer: params.cohortAtOffer}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * The cohort a booking written before #2493 kept on itself.
 * @param {unknown} booking The stored booking.
 * @return {string | undefined} The cohort id.
 */
export function legacyBookingCohort(booking: unknown): string | undefined {
  if (!booking || typeof booking !== "object") return undefined;
  return nonEmpty((booking as {cohortAtSignup?: unknown}).cohortAtSignup);
}

/**
 * A non-empty string, or undefined.
 * @param {unknown} value Any value.
 * @return {string | undefined} The string.
 */
function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
