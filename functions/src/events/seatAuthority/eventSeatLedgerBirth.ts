import {randomUUID} from "crypto";
import {deriveEventSeatPolicy} from "./firestoreAdapter";
import {heldSeatCount, SeatLedger} from "./seatAuthority";

/** The writer fence that marks a ledger as the event's seat authority. */
export interface EventSeatFence {
  eventId: string;
  organizerId: string;
  migrationRevision: number;
  token: string;
  state: "ready";
}

/**
 * The empty, ready seat ledger an event starts with, and the fence that
 * makes every seat writer use it. The capacity is the event's
 * `capacityLimit`, or no limit while none is set, so guests can be added
 * before the host sets admission terms. Throws when the event has no
 * organizer or status.
 */
export function newEventSeatLedger(eventId: string, event: unknown): {
  ledger: SeatLedger;
  fence: EventSeatFence;
} {
  const policy = deriveEventSeatPolicy(event);
  return {
    ledger: {eventId, capacity: policy.capacity, occupied: 0,
      checkoutHeld: 0, revision: 1, capacityRevision: 1,
      policyVersion: policy.policyVersion, policyHash: policy.policyHash,
      migrationRevision: 1, state: "ready"},
    fence: {eventId, organizerId: policy.organizerId, migrationRevision: 1,
      token: randomUUID(), state: "ready"},
  };
}

/** The event-keyed seat documents that go with an event when it is deleted. */
export const eventSeatLedgerDocuments =
  ["eventSeatLedgers", "eventSeatMigrationFences"] as const;

/** Seat records keyed by reservation, receipt, alias or proof, each with the
 * event's id in `eventId`, that go with a deleted draft. */
export const eventSeatRecordCollections = [
  "eventSeatReservations",
  "eventSeatRequestReceipts",
  "eventSeatIdentityAliases",
  "eventSeatVerifiedPhones",
] as const;

/** Create an event's ledger and fence in the transaction that creates it. */
export function createEventSeatLedgerInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  event: unknown,
): void {
  const {ledger, fence} = newEventSeatLedger(eventId, event);
  tx.create(db.collection("eventSeatLedgers").doc(eventId), ledger);
  tx.create(db.collection("eventSeatMigrationFences").doc(eventId), fence);
}

/**
 * Stage deletes of an event's ledger and fence alongside the event's own
 * delete. The caller has proved the ledger holds no seat.
 * @return {number} How many deletes this stages.
 */
export function deleteEventSeatLedgerInTransaction(
  tx: Pick<FirebaseFirestore.Transaction, "delete">,
  db: FirebaseFirestore.Firestore,
  eventId: string,
): number {
  for (const collection of eventSeatLedgerDocuments) {
    tx.delete(db.collection(collection).doc(eventId));
  }
  return eventSeatLedgerDocuments.length;
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
