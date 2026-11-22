/**
 * Bookings-owned seat side of runtime guest access under ready seat
 * authority: the guest's canonical seat identity, the attendee alias, the
 * seat reservation and the event's booked counter. Each `prepare` does its
 * reads and checks inside the caller's transaction and returns an `apply`
 * that stages the writes; neither opens a transaction of its own.
 */

import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {eventParticipationId} from "../../shared/relationshipDocuments";
import {
  FirestoreSeatIdentityAuthority,
  prepareCatchUidSeatIdentity,
  prepareVerifiedUidAttendeeEnrollment,
  seatIdentityAliasId,
  seatIdentityValueHash,
} from "../../events/seatIdentityAuthority";
import {
  applyFirestoreSeat,
  assertCurrentReadySeatSnapshot,
  FirestoreSeatTransaction,
  prepareFirestoreSeat,
} from "../../events/seatAuthority/firestoreAdapter";

type WalkInPolicy = NonNullable<EventDocument["runtimeAccess"]>[
  "walkInPolicy"];

/**
 * Checks a runtime guest's retained seat against the current event, identity
 * and ledger, with the runtime's one failure message.
 * @param {object} params Same as assertCurrentReadySeatSnapshot.
 */
export function requireRuntimeGuestSeatSnapshot(
  params: Parameters<typeof assertCurrentReadySeatSnapshot>[0]
): void {
  try {
    assertCurrentReadySeatSnapshot(params);
  } catch {
    throw new HttpsError("failed-precondition",
      "Runtime guest and seat authority disagree.");
  }
}

/**
 * Prepares a verified-phone runtime claim's seat: enrolls the guest's seat
 * identity (through the Host row when it came from the Host's list), reserves
 * a seat for an auto-created walk-in, and creates the phone-keyed attendee
 * alias when no roster row exists yet. Reads only; `apply` writes the
 * identity, alias, reservation and the event's booked counter, in that order.
 * @param {object} params Transaction, event, guest, the roster row as read
 *   (or null) and the event's walk-in policy.
 * @return {Promise<object>} Whether the guest already held an active seat,
 *   and the staged writes.
 */
export async function prepareRuntimeGuestSeatEnrollment(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  event: EventDocument;
  eventId: string;
  uid: string;
  phone: string;
  /** The roster row the claim resolved to, or null for a new walk-in. */
  attendee: EventAttendeeDocument | null;
  attendeeId: string;
  /** The phone-keyed row id a new walk-in's alias points at. */
  phoneAttendeeId: string;
  walkInPolicy: WalkInPolicy;
  now: FirebaseFirestore.Timestamp;
}): Promise<{seatAlreadyActive: boolean; apply: () => void}> {
  const {db, tx, event, eventId, uid, phone, attendee, now} = params;
  const organizerId = event.organizerId;
  const enrolled = attendee && attendee.source !== "catchBooking" ?
    await prepareVerifiedUidAttendeeEnrollment({db, tx, eventId,
      organizerId, attendeeId: params.attendeeId, uid,
      authTokenPhoneNumber: phone, now}) :
    await prepareCatchUidSeatIdentity({db, tx, eventId, organizerId, uid,
      currentAuthPhoneNumber: phone});
  const identity = enrolled.identity;
  const seats = new FirestoreSeatTransaction(db, tx);
  const [ledger, reservation] = await Promise.all([
    seats.ledger(eventId),
    seats.reservation(eventId, identity.key),
  ]);
  requireRuntimeGuestSeatSnapshot({event, eventId, organizerId, identity,
    ledger, reservation});
  const seatAlreadyActive = reservation?.active === true;
  if (attendee && (reservation?.active === true) !==
        (attendee.status === "registered" ||
          attendee.status === "checkedIn")) {
    throw new HttpsError("failed-precondition",
      "Runtime guest and seat authority disagree.");
  }
  let createAttendeeAlias: (() => void) | null = null;
  if (!attendee) {
    const aliasRef = db.collection("eventSeatIdentityAliases")
      .doc(seatIdentityAliasId(eventId, "attendee", params.phoneAttendeeId));
    const aliasSnap = await tx.get(aliasRef);
    if (aliasSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Runtime guest identity already exists.");
    }
    createAttendeeAlias = () => tx.create(aliasRef, {
      eventId, organizerId, kind: "attendee",
      valueHash: seatIdentityValueHash("attendee", params.phoneAttendeeId),
      canonicalKey: identity.key, identityRevision: identity.revision,
      migrationRevision: ledger!.migrationRevision, state: "ready",
    });
  }
  let applySeat: () => void = () => undefined;
  let nextBookedCount: number | null = null;
  const shouldReserve = params.walkInPolicy === "autoCreate" &&
    (!attendee || attendee.status === "invited" ||
      attendee.status === "waitlisted");
  if (shouldReserve && !reservation?.active) {
    const prepared = await prepareFirestoreSeat({db, tx,
      identityAuthority: {resolve: async () => identity},
      command: {eventId,
        subject: {kind: "verifiedUid", uid}, operation: "reserve",
        requestId: `runtime_${sha256(`${uid}_${
          reservation?.revision ?? 0}`).slice(0, 48)}`,
        expectedLedgerRevision: ledger!.revision,
        expectedCapacityRevision: ledger!.capacityRevision,
        expectedMigrationRevision: ledger!.migrationRevision,
        expectedReservationRevision: reservation?.revision ?? 0,
        nowMillis: now.toMillis()},
    });
    applySeat = () => {
      applyFirestoreSeat(prepared);
    };
    nextBookedCount = prepared.plan.ledger!.occupied;
  } else if (!attendee && reservation?.active) {
    const participation = await tx.get(db.collection("eventBookings")
      .doc(eventParticipationId(eventId, uid)));
    const current = participation.data();
    if (!current || current.eventId !== eventId || current.uid !== uid ||
        current.organizerId !== organizerId ||
        current.status !== "signedUp" && current.status !== "attended") {
      throw new HttpsError("failed-precondition",
        "Existing seat has no current Catch participation.");
    }
  }
  return {
    seatAlreadyActive,
    apply: () => {
      enrolled.apply();
      createAttendeeAlias?.();
      applySeat();
      writeBookedCount(db, tx, eventId, nextBookedCount, now);
    },
  };
}

/**
 * Prepares the seat for a Host-approved runtime claim: the guest's verified
 * account and the chosen Host row must resolve to the same seat identity, and
 * a row that held no active seat reserves one. Reads only; `apply` writes the
 * reservation and the event's booked counter.
 * @param {object} params Transaction, event, guest and the chosen row.
 * @return {Promise<object>} The staged writes.
 */
export async function prepareApprovedRuntimeGuestSeat(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  event: EventDocument;
  eventId: string;
  uid: string;
  attendeeId: string;
  attendee: EventAttendeeDocument;
  now: FirebaseFirestore.Timestamp;
}): Promise<{apply: () => void}> {
  const {db, tx, event, eventId, uid, attendeeId, attendee, now} = params;
  const organizerId = event.organizerId;
  const identities = new FirestoreSeatIdentityAuthority();
  const [verified, imported] = await Promise.all([
    identities.resolve({db, tx, eventId, organizerId,
      subject: {kind: "verifiedUid", uid}}),
    identities.resolve({db, tx, eventId, organizerId,
      subject: {kind: "importAttendee", attendeeId}}),
  ]);
  if (!verified || !imported || verified.key !== imported.key ||
      verified.revision !== imported.revision) {
    throw new HttpsError("failed-precondition",
      "Claim identity and guest seat disagree.");
  }
  const seats = new FirestoreSeatTransaction(db, tx);
  const [ledger, reservation] = await Promise.all([
    seats.ledger(eventId),
    seats.reservation(eventId, verified.key),
  ]);
  const wasActive = attendee.status === "registered" ||
    attendee.status === "checkedIn";
  requireRuntimeGuestSeatSnapshot({event, eventId, organizerId,
    identity: verified, ledger, reservation, expectedActive: wasActive});
  if (wasActive) return {apply: () => undefined};
  const prepared = await prepareFirestoreSeat({db, tx,
    identityAuthority: {resolve: async () => verified},
    command: {eventId,
      subject: {kind: "verifiedUid", uid},
      operation: "reserve",
      requestId: `runtime_approve_${sha256(`${uid}_${
        attendeeId}_${reservation?.revision ?? 0}`).slice(0, 48)}`,
      expectedLedgerRevision: ledger!.revision,
      expectedCapacityRevision: ledger!.capacityRevision,
      expectedMigrationRevision: ledger!.migrationRevision,
      expectedReservationRevision: reservation?.revision ?? 0,
      nowMillis: now.toMillis()},
  });
  const nextBookedCount = prepared.plan.ledger!.occupied;
  return {
    apply: () => {
      applyFirestoreSeat(prepared);
      writeBookedCount(db, tx, eventId, nextBookedCount, now);
    },
  };
}

function writeBookedCount(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  bookedCount: number | null,
  now: FirebaseFirestore.Timestamp
): void {
  if (bookedCount === null) return;
  tx.update(db.collection("events").doc(eventId), {bookedCount,
    updatedAt: now});
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
