import {Timestamp} from "firebase-admin/firestore";
import {
  catchBookingAttendeeDocument,
  eventAttendeeIndexDocument,
  eventAttendeeIndexId,
} from "../../events/eventAttendeeProjection";
import {eventAttendeeId} from "../../events/eventAttendees";
import type {
  EventAttendeeDocument,
  EventParticipationDocument,
} from "../generated/firestoreAdminTypes";

type Seed = Record<string, Record<string, unknown> | undefined>;

const SEEDED_AT = Timestamp.fromMillis(1_700_000_000_000);

/**
 * Test seeds keep describing bookings as participations; booking readers
 * read the roster row. This adds, for every seeded participation, the roster
 * row and index pointer the booking writers keep beside it. A row the seed
 * already links to the account gains the booking instead.
 * @param {Seed} seed Fake Firestore seed keyed by document path.
 * @return {Seed} Seed with roster rows and pointers added.
 */
export function withCatchBookingRows<T extends Seed>(seed: T): T {
  const next: Seed = {...seed};
  for (const [path, data] of Object.entries(seed)) {
    const match = /^eventParticipations\/[^/]+$/u.exec(path);
    if (!match || !data || typeof data.eventId !== "string" ||
        typeof data.uid !== "string") {
      continue;
    }
    const booking = {createdAt: SEEDED_AT, updatedAt: SEEDED_AT,
      signedUpAt: null, waitlistedAt: null, attendedAt: null,
      cancelledAt: null, deletedAt: null, genderAtSignup: null,
      paymentId: null, ...data} as unknown as EventParticipationDocument;
    const linked = Object.entries(next).find(([rowPath, row]) =>
      rowPath.startsWith("eventAttendees/") && row?.eventId === data.eventId &&
      row?.linkedUid === data.uid);
    const attendeeId = linked ? linked[0].split("/")[1] :
      eventAttendeeId(booking.eventId, `uid:${booking.uid}`);
    const existing = linked?.[1] as EventAttendeeDocument | undefined;
    next[`eventAttendees/${attendeeId}`] = {...(existing ?? {}),
      ...catchBookingAttendeeDocument({source: booking, sourceExists: true,
        existing, organizerId: booking.organizerId,
        displayName: existing?.displayName ?? booking.uid, now: SEEDED_AT}),
      // A Host-owned row keeps its own roster status.
      ...(existing && existing.source !== "catchBooking" ?
        {status: existing.status} : {}),
    } as unknown as Record<string, unknown>;
    next[`eventAttendeeIndex/${eventAttendeeIndexId(booking.eventId,
      booking.uid)}`] = eventAttendeeIndexDocument({source: booking,
        attendeeId, organizerId: booking.organizerId,
        now: SEEDED_AT}) as unknown as Record<string, unknown>;
  }
  return next as T;
}

/**
 * Reads a dotted field path the way a Firestore query filter does, so fakes
 * can filter roster rows on `booking.status`.
 * @param {unknown} data Document data.
 * @param {string} path Field path such as `booking.status`.
 * @return {unknown} The value at that path, or undefined.
 */
export function fieldAt(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    value !== null && typeof value === "object" ?
      (value as Record<string, unknown>)[key] : undefined, data);
}

/**
 * Adds the roster rows and pointers to a seed in place, for fakes whose
 * tests keep a reference to the seed object and inspect it afterwards.
 * @param {Seed} docs Fake Firestore seed keyed by document path.
 */
export function seedCatchBookingRows(docs: Seed): void {
  Object.assign(docs, withCatchBookingRows(docs));
}

/**
 * Adds the roster rows and pointers to a Map-backed fake store in place.
 * @param {Map<string, Record<string, unknown>>} docs Fake store by path.
 */
export function seedCatchBookingRowsInMap(
  docs: Map<string, Record<string, unknown>>
): void {
  const seeded = withCatchBookingRows(Object.fromEntries(docs));
  for (const [path, data] of Object.entries(seeded)) {
    if (data) docs.set(path, data);
  }
}

const IN_FILTER = Symbol("in");

/**
 * Wraps an `in` filter's values so an equality-only fake can store them.
 * @param {unknown} values The `in` filter's values.
 * @return {unknown} A marker that {@link fieldMatches} understands.
 */
export function inFilter(values: unknown): unknown {
  return {[IN_FILTER]: values};
}

/**
 * Compares a field to a fake filter value: equality, or `in` membership.
 * @param {unknown} actual Field value.
 * @param {unknown} expected Filter value, or an {@link inFilter} marker.
 * @return {boolean} Whether the document matches.
 */
export function fieldMatches(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object" &&
      IN_FILTER in expected) {
    const values = (expected as Record<symbol, unknown>)[IN_FILTER];
    return Array.isArray(values) && values.includes(actual);
  }
  return actual === expected;
}

/**
 * Writes a seeded participation together with its roster row and pointer,
 * for tests that add bookings after the fake store was built.
 * @param {object} store Fake store with a `setDoc(path, data)` method.
 * @param {string} path The `eventParticipations/{id}` path.
 * @param {Record<string, unknown>} data Participation fields.
 */
export function setCatchBookingDoc(
  store: {setDoc(path: string, data: Record<string, unknown>): unknown},
  path: string,
  data: Record<string, unknown>
): void {
  for (const [docPath, doc] of Object.entries(
    withCatchBookingRows({[path]: data}))) {
    if (doc) store.setDoc(docPath, doc);
  }
}
