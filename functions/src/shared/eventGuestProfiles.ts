/**
 * A guest's dating profile as the other guests of one event see it, at
 * eventGuestProfiles/{eventId}__{uid} (#2493, FIX-8).
 *
 * Owner decision OQ-1: the sensitive answers are for guests who share an
 * event, never for organisers. Security rules cannot ask "do these two people
 * share any event?" without an event id, so the event id is in the path: a
 * reader gets the copy only while both their booking and the subject's are
 * signedUp or attended (firestore.rules). A cancelled booking therefore
 * needs no write here; the copy stops being readable at once.
 *
 * The booking writers write the copy when a booking becomes signedUp or
 * attended (writeCatchBookingRoster), and syncPublicProfile rewrites the
 * copies of the guest's live bookings when the profile changes or deletes
 * them all when the profile goes. Account deletion deletes them by uid.
 */

export const EVENT_GUEST_PROFILES = "eventGuestProfiles";

/** Booking statuses whose guests may see each other's event profile. */
export const eventGuestProfileStatuses = ["signedUp", "attended"] as const;

/** Bookings the profile projector refreshes copies for, per change. */
export const maxEventGuestProfileCopies = 200;

type Db = FirebaseFirestore.Firestore;

/**
 * The copy's document id.
 * @param {string} eventId The event.
 * @param {string} uid The guest.
 * @return {string} {eventId}__{uid}
 */
export function eventGuestProfileId(eventId: string, uid: string): string {
  return `${eventId}__${uid}`;
}

/**
 * The copy's document.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {string} uid The guest.
 * @return {FirebaseFirestore.DocumentReference} The document.
 */
export function eventGuestProfileRef(db: Db, eventId: string, uid: string):
  FirebaseFirestore.DocumentReference {
  return db.collection(EVENT_GUEST_PROFILES)
    .doc(eventGuestProfileId(eventId, uid));
}

/**
 * Whether a booking status lets its guest be seen by the event's guests.
 * @param {unknown} status Booking status.
 * @return {boolean} Whether a copy belongs to it.
 */
export function bookingSharesEventProfile(status: unknown): boolean {
  return (eventGuestProfileStatuses as ReadonlyArray<unknown>)
    .includes(status);
}

/**
 * The copy's data: the guest's full profile, as guestProfiles holds it, plus
 * its event and guest.
 * @param {object} profile The guest's guestProfiles data.
 * @param {string} eventId The event.
 * @param {string} uid The guest.
 * @return {FirebaseFirestore.DocumentData} The copy.
 */
export function eventGuestProfileData(profile: FirebaseFirestore.DocumentData,
  eventId: string, uid: string): FirebaseFirestore.DocumentData {
  return {...profile, eventId, uid};
}
