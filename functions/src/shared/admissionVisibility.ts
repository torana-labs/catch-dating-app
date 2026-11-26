import * as admin from "firebase-admin";
import {admissionVisibilityCatalog} from
  "./generated/catalogs/admissionVisibilityCatalog";

/**
 * What an organiser may read about each guest, per admission policy (#2493,
 * FIX-19). contracts/catalogs/admission_visibility.json declares it; this
 * module resolves an event's admission format and writes the per-guest
 * disclosure at eventGuestDisclosures/{eventId}__{uid}.
 *
 * A disclosure holds only the extra fields the format needs: gender on a
 * gender-balanced event (owner decision OQ-2). Rules let the event's
 * organiser managers get it until it expires. No screen reads it yet, and
 * bookings keep genderAtSignup until the Host app reads disclosures.
 * Profile answers a guest shares for admission arrive with the profile-share
 * grant, a later #2493 step, so grantKey is always null today.
 */

export const EVENT_GUEST_DISCLOSURES = "eventGuestDisclosures";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
type Formats = typeof admissionVisibilityCatalog.formats;
export type AdmissionVisibilityFormat = keyof Formats;

/** The event fields the disclosure reads. */
export type DisclosureEvent = {
  organizerId?: unknown;
  endTime?: {toMillis?: () => number} | null;
  eventPolicy?: {admission?: {format?: unknown} | null} | null;
};

/**
 * The event's admission format as the catalog names it; an unknown or
 * missing format reads as open capacity, which discloses nothing extra.
 * @param {DisclosureEvent} event The event.
 * @return {AdmissionVisibilityFormat} The format.
 */
export function admissionVisibilityFormat(event: DisclosureEvent):
  AdmissionVisibilityFormat {
  const format = event.eventPolicy?.admission?.format;
  return typeof format === "string" &&
    Object.prototype.hasOwnProperty.call(admissionVisibilityCatalog.formats,
      format) ? format as AdmissionVisibilityFormat : "openCapacity";
}

/**
 * The extra guest fields the event's organiser may read without any grant.
 * @param {DisclosureEvent} event The event.
 * @return {string[]} Field ids.
 */
export function organiserFieldsFor(event: DisclosureEvent): string[] {
  return [...admissionVisibilityCatalog.formats[
    admissionVisibilityFormat(event)].organiserFields];
}

/**
 * One guest's disclosure document at one event.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {string} uid The guest.
 * @return {FirebaseFirestore.DocumentReference} The document.
 */
export function eventGuestDisclosureRef(db: Db, eventId: string,
  uid: string): FirebaseFirestore.DocumentReference {
  return db.collection(EVENT_GUEST_DISCLOSURES).doc(`${eventId}__${uid}`);
}

/**
 * The disclosure the event's format allows for this guest, or null when the
 * format needs no extra field or the guest has no value for it.
 * @param {object} params The event, ids and the guest's gender.
 * @return {Record<string, unknown> | null} The document data.
 */
export function eventGuestDisclosure(params: {
  eventId: string;
  uid: string;
  event: DisclosureEvent;
  gender?: string | null;
}): Record<string, unknown> | null {
  const allowed = organiserFieldsFor(params.event);
  const fields: Record<string, string> = {};
  if (allowed.includes("gender") && typeof params.gender === "string" &&
      params.gender) {
    fields.gender = params.gender;
  }
  if (Object.keys(fields).length === 0) return null;
  const organizerId = params.event.organizerId;
  const endMillis = params.event.endTime?.toMillis?.();
  if (typeof organizerId !== "string" || !organizerId ||
      typeof endMillis !== "number" || !Number.isFinite(endMillis)) {
    return null;
  }
  return {
    eventId: params.eventId,
    organizerId,
    uid: params.uid,
    format: admissionVisibilityFormat(params.event),
    fields,
    grantKey: null,
    expiresAt: admin.firestore.Timestamp.fromMillis(endMillis +
      admissionVisibilityCatalog.disclosureRetentionDaysAfterEnd *
        24 * 60 * 60 * 1000),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Writes what the event's admission format lets its organiser read about
 * this guest, and nothing else, in the booking's transaction. A format that
 * needs no extra field writes nothing. Call after every read of the
 * transaction.
 * @param {object} params Firestore, transaction, event, ids and gender.
 */
export function writeEventGuestDisclosure(params: {
  db: Db;
  tx: Tx;
  eventId: string;
  uid: string;
  event: DisclosureEvent;
  gender?: string | null;
}): void {
  const data = eventGuestDisclosure(params);
  if (!data) return;
  params.tx.set(eventGuestDisclosureRef(params.db, params.eventId,
    params.uid), data);
}

/**
 * Removes the guest's disclosure when they leave the event: a cancelled
 * booking or a left waitlist keeps nothing an organiser can read.
 * @param {object} params Firestore, transaction and ids.
 */
export function deleteEventGuestDisclosure(params: {
  db: Db;
  tx: Tx;
  eventId: string;
  uid: string;
}): void {
  params.tx.delete(eventGuestDisclosureRef(params.db, params.eventId,
    params.uid));
}
