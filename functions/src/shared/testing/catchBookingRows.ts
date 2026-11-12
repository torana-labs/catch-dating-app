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
