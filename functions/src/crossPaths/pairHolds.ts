import {preparePairSeatTransition} from "./pairSeatAuthority";
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import type {CrossPathsPairHoldDocument} from
  "../shared/generated/firestoreAdminTypes";
import {decrementCount} from "../events/eventPolicy";
import {requireDoc} from "../shared/validation";
import {
  type EventPairHoldCountersPatch,
  updateEventPairHoldCounters,
} from "../domain/events/eventDocumentWrites";
import {readEventWithCohortCounts} from
  "../domain/events/eventCohortCounts";

export type PairHoldReleaseReason =
  "expired" | "cancelled" | "event_unavailable" |
  "participation_cancelled" | "safety_state_changed" | "payment_failed";

/** Releases a pair reservation exactly once inside an existing transaction. */
export async function releaseCrossPathsPairHoldInTransaction(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  holdId: string;
  reason: PairHoldReleaseReason;
  now: FirebaseFirestore.Timestamp;
}): Promise<CrossPathsPairHoldDocument | null> {
  const holdRef = params.db.collection("crossPathsPairHolds")
    .doc(params.holdId);
  const holdSnap = await params.tx.get(holdRef);
  if (!holdSnap.exists) return null;
  const hold = requireDoc<CrossPathsPairHoldDocument>(
    holdSnap,
    "CrossPathsPairHoldDocument (release)"
  );
  if (hold.status !== "active" && hold.status !== "confirmed") return hold;

  // A stale expiry query must never cancel a booking that won the race.
  if (params.reason === "expired" && (hold.status !== "active" ||
      hold.expiresAt.toMillis() > params.now.toMillis())) return hold;
  const eventRef = params.db.collection("events").doc(hold.eventId);
  const eventSnap = await params.tx.get(eventRef);
  const stored = eventSnap.data();
  const event = stored ? await readEventWithCohortCounts(params.tx,
    params.db, hold.eventId, stored) : stored;
  const seatHold = hold.status === "active" ?
    await preparePairSeatTransition({db: params.db, tx: params.tx,
      event, eventId: hold.eventId, organizerId: hold.organizerId,
      requesterUid: hold.requesterUid, holdId: params.holdId,
      expiresAtMillis: hold.expiresAt.toMillis(),
      nowMillis: params.now.toMillis(), operation: "releaseTemporaryHold"}) :
    null;
  const invitationRef = params.reason === "expired" ?
    params.db.collection("crossPathsInvitations").doc(hold.invitationId) :
    null;
  const invitation = invitationRef ?
    (await params.tx.get(invitationRef)).data() : null;
  seatHold?.apply();
  if (invitationRef && invitation?.status === "accepted" &&
      invitation.pairHoldId === params.holdId) {
    params.tx.update(invitationRef, {status: "invalidated",
      updatedAt: params.now, invalidatedAt: params.now,
      invalidationReason: "hold_expired"});
  }
  if (event) {
    const eventUpdate: EventPairHoldCountersPatch = {};
    if (hold.status === "active") {
      eventUpdate.crossPathsPairHeldCount = Math.max(
        0,
        Math.trunc(Number(event.crossPathsPairHeldCount ?? 0)) - 1
      );
      eventUpdate.crossPathsPairHeldCohortCounts = decrementCount(
        event.crossPathsPairHeldCohortCounts as Record<string, number> ?? {},
        hold.requesterCohortId
      );
    } else {
      eventUpdate.crossPathsPairConfirmedCount = Math.max(
        0,
        Math.trunc(Number(event.crossPathsPairConfirmedCount ?? 0)) - 1
      );
    }
    updateEventPairHoldCounters(params.tx, eventRef, eventUpdate);
  }

  const terminalStatus = params.reason === "expired" ? "expired" :
    params.reason === "cancelled" ? "cancelled" : "invalidated";
  params.tx.update(holdRef, {
    status: terminalStatus,
    requesterBookingStatus: hold.status === "active" ? "cancelled" :
      hold.requesterBookingStatus,
    updatedAt: params.now,
    releasedAt: params.now,
    releaseReason: params.reason,
  });
  return hold;
}

/** Releases one hold in its own idempotent transaction. */
export async function releaseCrossPathsPairHold(params: {
  db: FirebaseFirestore.Firestore;
  holdId: string;
  reason: PairHoldReleaseReason;
  now?: FirebaseFirestore.Timestamp;
}): Promise<CrossPathsPairHoldDocument | null> {
  const now = params.now ?? admin.firestore.Timestamp.now();
  let released: CrossPathsPairHoldDocument | null = null;
  await params.db.runTransaction(async (tx) => {
    released = await releaseCrossPathsPairHoldInTransaction({
      tx,
      db: params.db,
      holdId: params.holdId,
      reason: params.reason,
      now,
    });
  });
  return released;
}

/** Expires short-lived pair reservations and returns capacity to the event. */
export const expireCrossPathsPairHolds = onSchedule(
  {schedule: "every 5 minutes", timeZone: "UTC"},
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection("crossPathsPairHolds")
      .where("status", "==", "active")
      .where("expiresAt", "<=", now)
      .limit(400)
      .get();
    for (const doc of snap.docs) {
      await releaseCrossPathsPairHold({
        db,
        holdId: doc.id,
        reason: "expired",
        now,
      });
    }
  }
);
