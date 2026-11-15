import * as admin from "firebase-admin";
import type {EventParticipationDocument} from "./generated/firestoreAdminTypes";

export type EventParticipationStatus =
  "signedUp" | "waitlisted" | "attended" | "cancelled" | "deleted";

export interface EventParticipationSnapshot {
  ref: FirebaseFirestore.DocumentReference;
  data: {
    eventId: string;
    organizerId: string;
    uid: string;
    status: EventParticipationStatus;
    genderAtSignup?: string;
    cohortAtSignup?: string;
  };
}

/**
 * Builds the deterministic organizer relationship document id.
 * Team memberships and follows use separate collections but share this stable
 * identity so the migration can be replayed safely.
 * @param {string} organizerId Organizer id.
 * @param {string} uid User id.
 * @return {string} Relationship document id.
 */
export function organizerRelationshipId(
  organizerId: string,
  uid: string
): string {
  return `${organizerId}_${uid}`;
}

/**
 * Creates the canonical active organizer-team edge patch.
 * @param {object} params Team edge fields.
 * @param {string} params.organizerId Organizer id.
 * @param {string} params.uid User id.
 * @param {"owner" | "manager"} params.role Team role.
 * @return {Record<string, unknown>} Firestore patch.
 */
export function activeOrganizerTeamMembershipPatch(params: {
  organizerId: string;
  uid: string;
  role: "owner" | "manager";
}) {
  return {
    organizerId: params.organizerId,
    uid: params.uid,
    role: params.role,
    status: "active" as const,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    removedAt: null,
  };
}

/**
 * Creates the canonical active organizer-follow edge patch.
 * @param {object} params Follow edge fields.
 * @param {string} params.organizerId Organizer id.
 * @param {string} params.uid User id.
 * @param {boolean=} params.pushNotificationsEnabled Push preference.
 * @return {Record<string, unknown>} Firestore patch.
 */
export function activeOrganizerFollowPatch(params: {
  organizerId: string;
  uid: string;
  pushNotificationsEnabled?: boolean;
}) {
  return {
    organizerId: params.organizerId,
    uid: params.uid,
    status: "active" as const,
    pushNotificationsEnabled: params.pushNotificationsEnabled ?? false,
    followedAt: admin.firestore.FieldValue.serverTimestamp(),
    unfollowedAt: null,
  };
}

/**
 * Builds the deterministic event participation document id.
 * @param {string} eventId Event id.
 * @param {string} uid User id.
 * @return {string} Participation document id.
 */
export function eventParticipationId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Builds the deterministic event waitlist offer document id.
 * @param {string} eventId Event id.
 * @param {string} uid Offered user id.
 * @return {string} Waitlist offer document id.
 */
export function eventWaitlistOfferId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Builds the deterministic saved-event document id.
 * @param {string} uid User id.
 * @param {string} eventId Event id.
 * @return {string} Saved-event document id.
 */
export function savedEventId(uid: string, eventId: string): string {
  return `${uid}_${eventId}`;
}

/**
 * The Catch booking a roster row carries, in the participation shape the
 * booking callables use. Null for rows with no linked Catch booking.
 * @param {FirebaseFirestore.DocumentData} row eventAttendees row.
 * @return {EventParticipationSnapshot["data"] | null} Booking.
 */
export function catchBookingFromRow(
  row: FirebaseFirestore.DocumentData | undefined
): EventParticipationSnapshot["data"] | null {
  const booking = row?.booking;
  if (!booking || typeof booking !== "object" ||
      typeof row?.linkedUid !== "string") {
    return null;
  }
  return {...booking, eventId: row.eventId, organizerId: row.organizerId,
    uid: row.linkedUid} as EventParticipationSnapshot["data"];
}

/**
 * One account's Catch booking on one event, read from its roster row. Shaped
 * like the participation snapshot its callers used to read: `ref` is the
 * participation the booking writers still write in the same transaction.
 */
export interface CatchBookingSnapshot {
  exists: boolean;
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  /** The roster row holding the booking, when there is one. */
  rowRef: FirebaseFirestore.DocumentReference | null;
  data(): EventParticipationDocument | undefined;
}

/**
 * The full booking a roster row carries, in the participation shape.
 * @param {FirebaseFirestore.DocumentData | undefined} row eventAttendees row.
 * @return {EventParticipationDocument | undefined} Booking, if linked.
 */
export function catchBookingDocumentFromRow(
  row: FirebaseFirestore.DocumentData | undefined
): EventParticipationDocument | undefined {
  const booking = catchBookingFromRow(row);
  if (!booking) return undefined;
  return {...booking, updatedAt: row?.updatedAt ?? null} as unknown as
    EventParticipationDocument;
}

type BookingReader = Pick<FirebaseFirestore.Transaction, "get"> | null;

/**
 * Reads one account's Catch booking on an event: the account's roster pointer,
 * then the row it names. Pass a transaction to read inside it.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {string} uid Account id.
 * @param {BookingReader=} tx Optional transaction.
 * @return {Promise<CatchBookingSnapshot>} The booking, or a missing snapshot.
 */
export async function getCatchBooking(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string,
  tx: BookingReader = null
): Promise<CatchBookingSnapshot> {
  const id = eventParticipationId(eventId, uid);
  const ref = db.collection("eventParticipations").doc(id);
  const get = (target: FirebaseFirestore.DocumentReference) =>
    tx ? tx.get(target) : target.get();
  const pointer = await get(db.collection("eventAttendeeIndex").doc(id));
  const attendeeId = pointer.data()?.attendeeId;
  if (typeof attendeeId !== "string" || !attendeeId) {
    return {exists: false, id, ref, rowRef: null, data: () => undefined};
  }
  const rowRef = db.collection("eventAttendees").doc(attendeeId);
  const row = await get(rowRef);
  const booking = catchBookingDocumentFromRow(row.data());
  // A pointer to a row linked to someone else is never this account's booking.
  const data = booking && booking.uid === uid && booking.eventId === eventId ?
    booking : undefined;
  return {exists: data !== undefined, id, ref, rowRef, data: () => data};
}

/**
 * Catch bookings from roster rows matching a query, keyed to the
 * participation each still writes.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {FirebaseFirestore.QuerySnapshot} snap Roster query result.
 * @return {CatchBookingSnapshot[]} Bookings, skipping unlinked rows.
 */
export function catchBookingsFromRows(
  db: FirebaseFirestore.Firestore,
  snap: FirebaseFirestore.QuerySnapshot
): CatchBookingSnapshot[] {
  return snap.docs.flatMap((doc) => {
    const data = catchBookingDocumentFromRow(doc.data());
    if (!data) return [];
    const id = eventParticipationId(data.eventId, data.uid);
    return [{exists: true, id, rowRef: doc.ref,
      ref: db.collection("eventParticipations").doc(id), data: () => data}];
  });
}

/**
 * One account's Catch bookings across events, from the roster.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Account id.
 * @param {object=} options Statuses to include and a row limit.
 * @return {Promise<CatchBookingSnapshot[]>} Bookings.
 */
export async function catchBookingsForUser(
  db: FirebaseFirestore.Firestore,
  uid: string,
  options: {statuses?: EventParticipationStatus[]; limit?: number;
    tx?: BookingReader} = {}
): Promise<CatchBookingSnapshot[]> {
  let query: FirebaseFirestore.Query = db.collection("eventAttendees")
    .where("linkedUid", "==", uid);
  if (options.statuses) {
    if (options.statuses.length === 0) return [];
    query = query.where("booking.status", "in", options.statuses);
  }
  if (options.limit !== undefined) query = query.limit(options.limit);
  const snap = options.tx ? await options.tx.get(query) : await query.get();
  return catchBookingsFromRows(db, snap);
}

/**
 * Catch bookings on one event, from the roster, outside a transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {object=} options Statuses to include and a row limit.
 * @return {Promise<CatchBookingSnapshot[]>} Bookings.
 */
export async function catchBookingsForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  options: {statuses?: EventParticipationStatus[]; limit?: number} = {}
): Promise<CatchBookingSnapshot[]> {
  let query: FirebaseFirestore.Query = db.collection("eventAttendees")
    .where("eventId", "==", eventId);
  if (options.statuses) {
    if (options.statuses.length === 0) return [];
    query = query.where("booking.status", "in", options.statuses);
  }
  if (options.limit !== undefined) query = query.limit(options.limit);
  return catchBookingsFromRows(db, await query.get());
}

/** Bookings from roster rows, keyed to the participation each still writes. */
function catchBookingSnapshots(
  db: FirebaseFirestore.Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): EventParticipationSnapshot[] {
  return docs.flatMap((doc) => {
    const data = catchBookingFromRow(doc.data());
    return data ? [{data, ref: db.collection("eventParticipations")
      .doc(eventParticipationId(data.eventId, data.uid))}] : [];
  });
}

/**
 * Reads Catch bookings by status from the event roster inside a transaction.
 * @param {FirebaseFirestore.Transaction} tx Transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {EventParticipationStatus[]} statuses Statuses to include.
 * @return {Promise<EventParticipationSnapshot[]>} Matching edge docs.
 */
export async function eventParticipationsByStatusInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  statuses: EventParticipationStatus[],
  options: {limit?: number} = {}
): Promise<EventParticipationSnapshot[]> {
  if (statuses.length === 0) return [];
  // The roster row carries each Catch booking; its booking status is the
  // booking's own lifecycle even when a Host owns the row's status.
  let query = db
    .collection("eventAttendees")
    .where("eventId", "==", eventId)
    .where("booking.status", "in", statuses);
  if (options.limit !== undefined) query = query.limit(options.limit);
  const snap = await tx.get(query);
  return catchBookingSnapshots(db, snap.docs);
}

/**
 * Reads waitlisted Catch bookings from the event roster in promotion order.
 * @param {FirebaseFirestore.Transaction} tx Transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @return {Promise<EventParticipationSnapshot[]>} Waitlist edges.
 */
export async function waitlistedEventParticipationsInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string
): Promise<EventParticipationSnapshot[]> {
  const query = db
    .collection("eventAttendees")
    .where("eventId", "==", eventId)
    .where("booking.status", "==", "waitlisted")
    .orderBy("booking.waitlistedAt", "asc");
  const snap = await tx.get(query);
  return catchBookingSnapshots(db, snap.docs);
}

/**
 * Returns active peer ids for block checks.
 * @param {EventParticipationSnapshot[]} participations Participation edges.
 * @param {string=} exceptUid Optional user id to exclude.
 * @return {string[]} Unique participant user ids.
 */
export function participantUids(
  participations: EventParticipationSnapshot[],
  exceptUid?: string
): string[] {
  return [...new Set(
    participations
      .map((participation) => participation.data.uid)
      .filter((uid) => uid && uid !== exceptUid)
  )];
}

/**
 * Creates a status-specific event participation patch.
 * @param {object} params Participation fields.
 * @param {boolean} params.exists Whether the edge document already exists.
 * @param {string} params.eventId Event id.
 * @param {string} params.organizerId Club id.
 * @param {string} params.uid User id.
 * @param {EventParticipationStatus} params.status New participation status.
 * @param {string=} params.genderAtSignup Optional signup-time gender snapshot.
 * @param {string=} params.cohortAtSignup Optional signup-time policy cohort.
 * @param {string=} params.paymentId Optional linked payment document id.
 * @return {Record<string, unknown>} Firestore patch.
 */
export function eventParticipationPatch(params: {
  exists: boolean;
  eventId: string;
  organizerId: string;
  uid: string;
  status: EventParticipationStatus;
  genderAtSignup?: string;
  cohortAtSignup?: string;
  paymentId?: string;
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const patch: Record<string, unknown> = {
    eventId: params.eventId,
    organizerId: params.organizerId,
    uid: params.uid,
    status: params.status,
    updatedAt: now,
  };

  if (!params.exists) {
    patch.createdAt = now;
    // These nullable fields are required by the canonical roster contract.
    // Initialize only new edges so later transitions retain existing history
    // and payment attribution unless the status explicitly clears a field.
    patch.signedUpAt = null;
    patch.waitlistedAt = null;
    patch.attendedAt = null;
    patch.cancelledAt = null;
    patch.deletedAt = null;
    patch.genderAtSignup = null;
    patch.paymentId = null;
  }
  if (params.genderAtSignup !== undefined) {
    patch.genderAtSignup = params.genderAtSignup;
  }
  if (params.cohortAtSignup !== undefined) {
    patch.cohortAtSignup = params.cohortAtSignup;
  }
  if (params.paymentId !== undefined) {
    patch.paymentId = params.paymentId;
  }

  switch (params.status) {
  case "signedUp":
    patch.signedUpAt = now;
    patch.waitlistedAt = null;
    patch.attendedAt = null;
    patch.cancelledAt = null;
    patch.deletedAt = null;
    break;
  case "waitlisted":
    patch.waitlistedAt = now;
    patch.attendedAt = null;
    patch.cancelledAt = null;
    patch.deletedAt = null;
    break;
  case "attended":
    patch.attendedAt = now;
    patch.cancelledAt = null;
    patch.deletedAt = null;
    break;
  case "cancelled":
    patch.cancelledAt = now;
    break;
  case "deleted":
    patch.deletedAt = now;
    break;
  }

  return patch;
}
