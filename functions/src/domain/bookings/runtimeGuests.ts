/**
 * Bookings-owned writes to a runtime guest's roster row (`eventAttendees`).
 * The live runtime decides who may claim, check in or answer; these functions
 * own the row's shape and the event counters that move with it. Each one runs
 * inside the caller's transaction, after every read.
 */

import * as admin from "firebase-admin";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../../shared/generated/firestoreAdminTypes";

type WriteTime = FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
type WalkInPolicy = NonNullable<EventDocument["runtimeAccess"]>[
  "walkInPolicy"];

/**
 * Checks a registered runtime guest in: the row records who checked it in
 * and its pre-check-in status, and the event's checked-in counter goes up by
 * one. The caller has already checked the row belongs to the guest and is
 * registered, not yet checked in.
 * @param {object} params Transaction, refs, the row as read, actor and time.
 */
export function checkInRuntimeGuest(params: {
  tx: FirebaseFirestore.Transaction;
  eventRef: FirebaseFirestore.DocumentReference;
  attendeeRef: FirebaseFirestore.DocumentReference;
  attendee: Pick<EventAttendeeDocument, "status" | "attendanceRevision">;
  checkedInBy: string;
  now: WriteTime;
  /** Also stamps the event's updatedAt with `now`. */
  touchEvent: boolean;
}): void {
  const {tx, attendee, now} = params;
  tx.update(params.attendeeRef, {
    status: "checkedIn",
    checkedInAt: now,
    checkedInBy: params.checkedInBy,
    attendanceRevision: (attendee.attendanceRevision ?? 0) + 1,
    preCheckInStatus: attendee.status,
    updatedAt: now,
  });
  tx.update(params.eventRef, {
    checkedInCount: admin.firestore.FieldValue.increment(1),
    ...(params.touchEvent ? {updatedAt: now} : {}),
  });
}

/**
 * Records the team a runtime guest named in their event profile as the row's
 * arrival group.
 * @param {object} params Transaction, row id, team name and time.
 */
export function setRuntimeGuestArrivalGroup(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  attendeeId: string;
  arrivalGroup: string;
  now: WriteTime;
}): void {
  params.tx.update(params.db.collection("eventAttendees")
    .doc(params.attendeeId), {
    arrivalGroup: params.arrivalGroup,
    updatedAt: params.now,
  });
}

/**
 * Writes the roster row for a guest who claimed runtime access with a
 * verified phone: a new row when the Host's list has none, otherwise the
 * existing row gains the guest's link (and, under ready seat authority with
 * auto-created walk-ins, moves from invited or waitlisted to registered).
 * @param {object} params Transaction, the row as read (or null) and the
 *   claim's facts.
 * @return {EventAttendeeDocument} The row as the caller should treat it
 *   after this write. A linked existing row keeps its stored status.
 */
export function enrollRuntimeGuestAttendee(params: {
  tx: FirebaseFirestore.Transaction;
  attendeeRef: FirebaseFirestore.DocumentReference;
  existing: EventAttendeeDocument | null;
  eventId: string;
  organizerId: string;
  uid: string;
  displayName: string;
  phone: string;
  walkInPolicy: WalkInPolicy;
  /** The guest already holds an active seat from a Catch booking. */
  seatAlreadyActive: boolean;
  /** Invite link the claim arrived through, when one resolved. */
  inviteLinkId: string | null;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeDocument {
  const {tx, attendeeRef, existing, now} = params;
  if (!existing) {
    const attendee = runtimeGuestAttendeeDocument({
      eventId: params.eventId,
      organizerId: params.organizerId,
      uid: params.uid,
      displayName: params.displayName,
      phone: params.phone,
      source: params.seatAlreadyActive ? "catchBooking" : "webOtp",
      status: params.walkInPolicy === "autoCreate" ||
        params.seatAlreadyActive ? "registered" : "invited",
      inviteLinkId: params.inviteLinkId,
      now,
    });
    tx.create(attendeeRef, attendee);
    return attendee;
  }
  tx.update(attendeeRef, {
    linkedUid: params.uid,
    linkedAt: existing.linkedAt ?? now,
    ...(params.walkInPolicy === "autoCreate" &&
      (existing.status === "invited" ||
        existing.status === "waitlisted") ? {
        status: "registered", registeredAt: existing.registeredAt ?? now,
      } : {}),
    ...(existing.inviteLinkId || params.inviteLinkId === null ? {} : {
      inviteLinkId: params.inviteLinkId,
      inviteCapturedAt: now,
    }),
    updatedAt: now,
  });
  return {...existing, linkedUid: params.uid};
}

/**
 * Links a Host-approved runtime claim to the roster row the Host chose. An
 * invited or waitlisted row becomes registered; the row keeps its
 * attendance history.
 * @param {object} params Transaction, the row as read, guest and time.
 */
export function linkApprovedRuntimeGuest(params: {
  tx: FirebaseFirestore.Transaction;
  attendeeRef: FirebaseFirestore.DocumentReference;
  attendee: EventAttendeeDocument;
  uid: string;
  now: FirebaseFirestore.Timestamp;
}): void {
  const {attendee, now} = params;
  params.tx.update(params.attendeeRef, {
    linkedUid: params.uid,
    linkedAt: attendee.linkedAt ?? now,
    status: attendee.status === "invited" ||
      attendee.status === "waitlisted" ? "registered" : attendee.status,
    registeredAt: attendee.registeredAt ?? now,
    attendanceRevision: attendee.attendanceRevision ?? 0,
    preCheckInStatus: attendee.preCheckInStatus ?? null,
    updatedAt: now,
  });
}

/**
 * A new roster row for a runtime guest who is not on the Host's list yet.
 * @param {object} params Event, guest and claim facts.
 * @return {EventAttendeeDocument} The full row.
 */
export function runtimeGuestAttendeeDocument(params: {
  eventId: string;
  organizerId: string;
  uid: string | null;
  displayName: string;
  phone: string;
  source?: EventAttendeeDocument["source"];
  status: "invited" | "registered";
  inviteLinkId: string | null;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeDocument {
  return {
    eventId: params.eventId,
    organizerId: params.organizerId,
    displayName: params.displayName,
    searchName: params.displayName.toLocaleLowerCase("en"),
    source: params.source ?? "webOtp",
    status: params.status,
    linkedUid: params.uid,
    phoneE164: params.source === "catchBooking" ? null : params.phone,
    email: null,
    externalReference: null,
    arrivalGroup: null,
    ticketType: null,
    importId: null,
    sourceRowId: null,
    createdAt: params.now,
    updatedAt: params.now,
    registeredAt: params.status === "registered" ? params.now : null,
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: params.uid ? params.now : null,
    inviteLinkId: params.inviteLinkId,
    inviteCapturedAt: params.inviteLinkId ? params.now : null,
    attendanceRevision: 0,
    preCheckInStatus: null,
  };
}
