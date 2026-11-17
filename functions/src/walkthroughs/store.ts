/* eslint-disable max-len */
import type {
  WalkthroughAvailabilityDocument,
  WalkthroughBookingDocument,
  WalkthroughSlotHoldDocument,
} from "../shared/generated/firestoreAdminTypes";
import {CALENDAR_ID, holdIdFor, offeredRange, type AvailabilitySettings, type Slot} from "./calendar";
import {WALKTHROUGH_COLLECTIONS, managePath, type AdminBookingRow, type AvailabilityView} from "./model";

// Reads and writes shared by the public and Admin walkthrough callables. The
// slot hold is what makes a slot bookable once: its id is the calendar and
// the slot start, so every booking or move of one slot reads and writes the
// same document inside its transaction, and Firestore lets only one commit.

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/** Bookings in one range read at most this many; more marks the answer truncated. */
export const MAX_BOOKINGS_READ = 500;
/** A calendar offers at most 28 days of 96 fifteen-minute slots. */
const MAX_HOLDS_READ = 28 * 96;

export function availabilityRef(db: Db): FirebaseFirestore.DocumentReference {
  return db.collection(WALKTHROUGH_COLLECTIONS.availability).doc(CALENDAR_ID);
}

export function bookingRef(db: Db, bookingId: string): FirebaseFirestore.DocumentReference {
  return db.collection(WALKTHROUGH_COLLECTIONS.bookings).doc(bookingId);
}

export function holdRef(db: Db, startAt: string): FirebaseFirestore.DocumentReference {
  return db.collection(WALKTHROUGH_COLLECTIONS.holds).doc(holdIdFor(startAt));
}

export function availabilityOf(snapshot: FirebaseFirestore.DocumentSnapshot): WalkthroughAvailabilityDocument | null {
  return snapshot.exists ? snapshot.data() as WalkthroughAvailabilityDocument : null;
}

export function availabilityView(doc: WalkthroughAvailabilityDocument | null): AvailabilityView | null {
  return doc ? {settings: doc.settings, revision: doc.revision, updatedAt: doc.updatedAt, updatedByUid: doc.updatedByUid} : null;
}

/** The slot starts some booking holds in [from, to). */
export async function heldStarts(db: Db, from: string, to: string): Promise<Set<string>> {
  const snapshot = await db.collection(WALKTHROUGH_COLLECTIONS.holds)
    .where("slotStartAt", ">=", from).where("slotStartAt", "<", to)
    .orderBy("slotStartAt").limit(MAX_HOLDS_READ).get();
  return new Set(snapshot.docs.map((doc) => doc.data() as WalkthroughSlotHoldDocument)
    .filter((hold) => hold.status === "held").map((hold) => hold.slotStartAt));
}

/** Held starts across everything the calendar can offer from now. */
export async function heldInHorizon(db: Db, settings: AvailabilitySettings, now: Date): Promise<Set<string>> {
  const range = offeredRange(settings, now);
  return heldStarts(db, range.from, range.to);
}

/** True when another booking holds this slot now. */
export function heldByOther(snapshot: FirebaseFirestore.DocumentSnapshot, bookingId: string): boolean {
  const hold = snapshot.exists ? snapshot.data() as WalkthroughSlotHoldDocument : null;
  return hold?.status === "held" && hold.bookingId !== bookingId;
}

export function writeHold(tx: Tx, db: Db, slot: Slot, bookingId: string, status: "held" | "released", now: Date): void {
  const hold: WalkthroughSlotHoldDocument = {schemaVersion: 1, holdId: holdIdFor(slot.startAt), calendarId: CALENDAR_ID,
    slotStartAt: slot.startAt, slotEndAt: slot.endAt, status, bookingId, updatedAt: now.toISOString()};
  tx.set(holdRef(db, slot.startAt), hold);
}

/** Releases a hold only while this booking holds it; reads must already be done. */
export function releaseHoldIfOwned(tx: Tx, db: Db, snapshot: FirebaseFirestore.DocumentSnapshot,
  booking: WalkthroughBookingDocument, now: Date): void {
  const hold = snapshot.exists ? snapshot.data() as WalkthroughSlotHoldDocument : null;
  if (hold?.status === "held" && hold.bookingId === booking.bookingId) {
    writeHold(tx, db, booking.slot, booking.bookingId, "released", now);
  }
}

export function publicSlot(booking: WalkthroughBookingDocument): Slot {
  return {startAt: booking.slot.startAt, endAt: booking.slot.endAt, label: booking.slot.label};
}

/** A person confirmed the slot the booking holds now; a move needs a new confirmation. */
export function isConfirmed(booking: WalkthroughBookingDocument): boolean {
  return booking.status === "booked" && booking.staffConfirmation?.slotStartAt === booking.slot.startAt;
}

/** The Admin Inbox item a booking projects to (functions/src/walkthroughs/inbox.ts). */
export function walkthroughInboxItemId(bookingId: string): string {
  return `walkthrough-${bookingId}`;
}

export function adminBookingRow(booking: WalkthroughBookingDocument): AdminBookingRow {
  return {
    bookingId: booking.bookingId,
    status: booking.status,
    slot: publicSlot(booking),
    phone: booking.phone,
    name: booking.name,
    details: booking.details,
    cityId: booking.cityId,
    confirmed: isConfirmed(booking),
    staffConfirmation: booking.staffConfirmation,
    cancellation: booking.cancellation ?
      {at: booking.cancellation.at, by: booking.cancellation.by, reason: booking.cancellation.reason} : null,
    rescheduleCount: booking.reschedules.length,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    managePath: managePath(booking.bookingId),
    inboxItemId: walkthroughInboxItemId(booking.bookingId),
  };
}

/** Cancels a booking and frees its slot; the caller has read the booking and its hold. */
export function cancelBooking(tx: Tx, db: Db, booking: WalkthroughBookingDocument,
  holdSnapshot: FirebaseFirestore.DocumentSnapshot, cancellation: NonNullable<WalkthroughBookingDocument["cancellation"]>,
  now: Date): WalkthroughBookingDocument {
  const next: WalkthroughBookingDocument = {...booking, status: "cancelled", cancellation, updatedAt: now.toISOString()};
  releaseHoldIfOwned(tx, db, holdSnapshot, booking, now);
  tx.set(bookingRef(db, booking.bookingId), next);
  return next;
}
