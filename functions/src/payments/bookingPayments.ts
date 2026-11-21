import {GUEST_PAYMENTS} from "./guestPayments";

/**
 * Native Catch booking payments (Razorpay or Stripe checkout in the app) live
 * in the one guest-payment ledger with purpose `booking`. Their ids are the
 * provider payment id (Razorpay) or an auto id (Stripe), never one of the
 * other flows' prefixes, and bookings point at them through
 * eventBookings.paymentId. A booking may also name a website payment
 * (pp_), so every read here checks the purpose before trusting a document.
 */
export const BOOKING_PAYMENT_PURPOSE = "booking";

/**
 * A booking payment document reference; a new auto id when none is given.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string=} paymentId Payment document id.
 * @return {FirebaseFirestore.DocumentReference} Reference.
 */
export function bookingPaymentRef(
  db: FirebaseFirestore.Firestore,
  paymentId?: string
): FirebaseFirestore.DocumentReference {
  const collection = db.collection(GUEST_PAYMENTS);
  return paymentId === undefined ? collection.doc() : collection.doc(paymentId);
}

/**
 * Booking payments only; add filters to this query.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @return {FirebaseFirestore.Query} Query over booking payments.
 */
export function bookingPayments(
  db: FirebaseFirestore.Firestore
): FirebaseFirestore.Query {
  return db.collection(GUEST_PAYMENTS)
    .where("purpose", "==", BOOKING_PAYMENT_PURPOSE);
}

/**
 * Whether stored ledger data is a booking payment.
 * @param {unknown} data Document data.
 * @return {boolean} True for purpose `booking`.
 */
export function isBookingPaymentData(data: unknown): boolean {
  return data !== null && typeof data === "object" &&
    (data as Record<string, unknown>).purpose === BOOKING_PAYMENT_PURPOSE;
}

export interface BookingPaymentSnapshot {
  ref: FirebaseFirestore.DocumentReference;
  id: string;
  exists: boolean;
  data(): FirebaseFirestore.DocumentData | undefined;
}

/**
 * Reads one booking payment; a document of another purpose reads as missing.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} paymentId Payment document id.
 * @param {object=} tx Transaction to read through, if any.
 * @return {Promise<BookingPaymentSnapshot>} Snapshot.
 */
export async function readBookingPayment(
  db: FirebaseFirestore.Firestore,
  paymentId: string,
  tx: Pick<FirebaseFirestore.Transaction, "get"> | null = null
): Promise<BookingPaymentSnapshot> {
  const ref = bookingPaymentRef(db, paymentId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const raw = snap.data();
  const data = isBookingPaymentData(raw) ? raw : undefined;
  return {ref, id: paymentId, exists: data !== undefined, data: () => data};
}
