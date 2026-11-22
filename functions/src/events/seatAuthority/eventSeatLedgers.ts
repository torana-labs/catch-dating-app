import {HttpsError} from "firebase-functions/v2/https";
import {deriveEventSeatPolicy} from "./firestoreAdapter";
import {heldSeatCount, SeatLedger} from "./seatAuthority";

/**
 * An event's seat ledger lifecycle. Every event is created with its ledger,
 * every seat writer requires it, and it is deleted with the event. There is
 * no event without a ledger and no other seat path.
 */

const ledgers = "eventSeatLedgers";

/** Seat records keyed by reservation, receipt, alias or proof, each with the
 * event's id in `eventId`, that go with a deleted draft. */
export const eventSeatRecordCollections = [
  "eventSeatReservations",
  "eventSeatRequestReceipts",
  "eventSeatIdentityAliases",
  "eventSeatVerifiedPhones",
] as const;

/**
 * The empty, ready seat ledger an event starts with. The capacity is the
 * event's `capacityLimit`, or no limit while none is set, so guests can be
 * added before the host sets admission terms. Throws when the event has no
 * organizer or status.
 */
export function newEventSeatLedger(eventId: string,
  event: unknown): SeatLedger {
  const policy = deriveEventSeatPolicy(event);
  return {eventId, capacity: policy.capacity, occupied: 0, checkoutHeld: 0,
    revision: 1, capacityRevision: 1, policyVersion: policy.policyVersion,
    policyHash: policy.policyHash, migrationRevision: 1, state: "ready"};
}

/** Create an event's ledger in the transaction that creates the event. */
export function createEventSeatLedgerInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  event: unknown,
): void {
  tx.create(db.collection(ledgers).doc(eventId),
    newEventSeatLedger(eventId, event));
}

/**
 * The event's ready seat ledger, read in the caller's transaction. Every
 * seat writer reads it before its own seat, roster or counter writes; a
 * missing or revoked ledger fails closed.
 */
export async function requireEventSeatLedger(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
}): Promise<SeatLedger> {
  const {db, tx, eventId} = params;
  const ledger = (await tx.get(db.collection(ledgers).doc(eventId)))
    .data() as SeatLedger | undefined;
  if (!ledger || ledger.eventId !== eventId || ledger.state !== "ready") {
    throw new HttpsError("failed-precondition",
      "This event's seat ledger is unavailable.");
  }
  return ledger;
}

/**
 * Stage the delete of an event's ledger alongside the event's own delete.
 * The caller has proved the ledger holds no seat.
 * @return {number} How many deletes this stages.
 */
export function deleteEventSeatLedgerInTransaction(
  tx: Pick<FirebaseFirestore.Transaction, "delete">,
  db: FirebaseFirestore.Firestore,
  eventId: string,
): number {
  tx.delete(db.collection(ledgers).doc(eventId));
  return 1;
}

/** Whether a stored ledger holds a confirmed or held place. A ledger that
 * cannot be read as one is treated as holding places. */
export function seatLedgerHoldsPlaces(value: unknown): boolean {
  const ledger = value as SeatLedger | undefined;
  if (!ledger) return false;
  try {
    return ledger.occupied !== 0 || heldSeatCount(ledger) !== 0;
  } catch {
    return true;
  }
}

/** Whether a ledger has a checkout or temporary hold in progress. A ledger
 * that cannot be read as one is treated as holding. */
export function seatLedgerHasHolds(ledger: SeatLedger): boolean {
  try {
    return heldSeatCount(ledger) !== 0;
  } catch {
    return true;
  }
}
