import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  EventAttendeeDocument,
  EventParticipationDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {eventAttendeeId, normalizeRosterPhone} from "./eventAttendees";
import {catchBookingAttendeeDocument} from "./eventAttendeeProjection";

/**
 * In-transaction roster writer for Catch bookings. The booking
 * (eventParticipations) is the one record of a guest's booking; its roster
 * row is the Host's view of that guest. A booking callable reads the
 * account's roster slot with its other reads, then writes the roster row and
 * the booking's link to it beside the booking it already writes, so the
 * roster never lags the booking.
 */
export interface CatchBookingRosterSlot {
  bookingRef: FirebaseFirestore.DocumentReference;
  /** The roster row the stored booking already links to, if any. */
  linkedAttendeeId: string | null;
  attendeeRef: FirebaseFirestore.DocumentReference;
  existing: EventAttendeeDocument | undefined;
  displayName: string | undefined;
  /** More than one row is linked to the account: left for reconciliation. */
  ambiguous?: boolean;
}

/**
 * Reads the account's roster slot. Order: the row the booking links to, then
 * a row the caller already identified, then a row already linked to the
 * account (a Host row the guest booked into), then a phone-keyed row the
 * organizer supplied, then the account's own key.
 * @param {object} params Transaction, event, account and optional hints.
 * @return {Promise<CatchBookingRosterSlot>} Slot to write later.
 */
export async function readCatchBookingRoster(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  uid: string;
  attendeeId?: string | null;
  /** Loaded only when no pointer or known row exists yet. */
  verifiedPhone?: () => Promise<string | null>;
}): Promise<CatchBookingRosterSlot> {
  const {db, tx, eventId, uid} = params;
  const bookingRef = db.collection("eventParticipations")
    .doc(eventParticipationId(eventId, uid));
  const stored = (await tx.get(bookingRef)).data()?.attendeeId;
  const linkedAttendeeId = typeof stored === "string" && stored ?
    stored : null;
  let attendeeId = linkedAttendeeId ?? params.attendeeId ?? null;
  if (!attendeeId) {
    // A row already linked to this account (Host link, earlier projection).
    const linked = await tx.get(db.collection("eventAttendees")
      .where("eventId", "==", eventId).where("linkedUid", "==", uid).limit(2));
    if (linked.docs.length > 1) {
      return {bookingRef, linkedAttendeeId, attendeeRef: linked.docs[0].ref,
        existing: undefined, displayName: undefined, ambiguous: true};
    }
    attendeeId = linked.docs[0]?.id ?? null;
  }
  if (!attendeeId) {
    const phone = params.verifiedPhone ? await params.verifiedPhone() : null;
    attendeeId = eventAttendeeId(eventId,
      phone ? `phone:${phone}` : `uid:${uid}`);
  }
  const attendeeRef = db.collection("eventAttendees").doc(attendeeId);
  const [attendeeSnap, profileSnap] = await Promise.all([
    tx.get(attendeeRef),
    tx.get(db.collection("publicProfiles").doc(uid)),
  ]);
  const name = profileSnap.data()?.name;
  return {bookingRef, linkedAttendeeId, attendeeRef,
    existing: attendeeSnap.data() as EventAttendeeDocument | undefined,
    displayName: typeof name === "string" && name.trim() ?
      name.trim() : undefined};
}

/**
 * The booking as it will read after a merge write of `patch` over `before`.
 * @param {object | undefined} before Stored booking.
 * @param {Record<string, unknown>} patch Merge patch being written.
 * @return {EventParticipationDocument} Booking after the write.
 */
export function participationAfterPatch(
  before: object | undefined,
  patch: Record<string, unknown>
): EventParticipationDocument {
  const deleteSentinel = admin.firestore.FieldValue.delete();
  const after: Record<string, unknown> = {...(before ?? {})};
  for (const [key, value] of Object.entries(patch)) {
    if (value instanceof admin.firestore.FieldValue &&
        value.isEqual(deleteSentinel)) {
      delete after[key];
    } else {
      after[key] = value;
    }
  }
  return after as unknown as EventParticipationDocument;
}

/**
 * Writes the roster row (merged, so Host-only fields survive) and links the
 * booking to it. Call after every transaction read. Under ready seat
 * authority a Host-supplied row keeps its Host-owned fields, and a row the
 * caller writes itself (factsOnly) is left to the caller; both only gain the
 * booking's link.
 * @param {object} params Transaction, slot, booking after this write, time.
 */
export function writeCatchBookingRoster(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  slot: CatchBookingRosterSlot;
  booking: EventParticipationDocument;
  now: FirebaseFirestore.Timestamp;
  seatReady?: boolean;
  /** The caller writes the row itself in this transaction. */
  factsOnly?: boolean;
}): void {
  const {tx, slot, booking, now} = params;
  if (slot.ambiguous) {
    logger.warn("Ambiguous Catch booking roster row", {eventId:
      booking.eventId, uid: booking.uid});
    return;
  }
  const hostOwned = params.factsOnly === true ||
    params.seatReady === true && slot.existing !== undefined &&
    slot.existing.source !== "catchBooking";
  if (!hostOwned) {
    tx.set(slot.attendeeRef, catchBookingAttendeeDocument({source: booking,
      sourceExists: true, existing: slot.existing,
      organizerId: booking.organizerId,
      displayName: slot.displayName ?? slot.existing?.displayName ??
        booking.uid,
      now}), {merge: true});
  }
  if (slot.linkedAttendeeId !== slot.attendeeRef.id) {
    tx.set(slot.bookingRef, {attendeeId: slot.attendeeRef.id},
      {merge: true});
  }
}

/**
 * The account's verified Auth phone, normalized as a roster key. Used only to
 * join a row the organizer already supplied; never copied into Host data.
 * @param {string} uid Catch account id.
 * @param {Function} loader Optional loader (tests, callers with Auth data).
 * @return {Promise<string | null>} E.164 phone, or null.
 */
export async function loadVerifiedRosterPhone(
  uid: string,
  loader?: (uid: string) => Promise<string | null>
): Promise<string | null> {
  try {
    const phone = loader ? await loader(uid) :
      (await admin.auth().getUser(uid)).phoneNumber ?? null;
    return normalizeRosterPhone(phone).value;
  } catch {
    return null;
  }
}
