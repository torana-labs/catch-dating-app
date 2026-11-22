import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {fitsSeatCapacity, heldSeatCount, SeatLedger,
  validSeatCapacity} from "./seatAuthority/seatAuthority";

/** Keep permitted event policy edits atomic with their capacity authority.
 *
 * A capacity-only edit (the admission policy is otherwise unchanged) may run
 * while seats are reserved, as long as the new capacity still holds every
 * confirmed and held place; a no-limit capacity holds any number. The
 * first terms of an event that had none (no capacity, no policy) may also be
 * set while guests hold seats. Any other admission policy change needs an
 * event with no reserved seats.
 */
export async function prepareEventMutationLedger(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  before: EventDocument,
  after: EventDocument
): Promise<{update: SeatLedger | null; reserved: number;
  termsChanged: boolean}> {
  const snap = await tx.get(db.collection("eventSeatLedgers").doc(eventId));
  const ledger = snap.data() as SeatLedger | undefined;
  let previous;
  let next;
  try {
    previous = deriveEventSeatPolicy(before);
    next = deriveEventSeatPolicy(after);
  } catch {
    throw new HttpsError("failed-precondition",
      "Invalid seat capacity policy.");
  }
  if (!ledger || ledger.eventId !== eventId || ledger.state !== "ready" ||
      ledger.capacity !== previous.capacity ||
      ledger.policyHash !== previous.policyHash ||
      ledger.policyVersion !== previous.policyVersion ||
      !Number.isSafeInteger(ledger.occupied) || ledger.occupied < 0 ||
      !validSeatCapacity(ledger.capacity) ||
      !fitsSeatCapacity(ledger.capacity, ledger.occupied) ||
      !Number.isSafeInteger(ledger.revision) || ledger.revision < 1 ||
      ledger.revision >= Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(ledger.capacityRevision) ||
      ledger.capacityRevision < 1 ||
      ledger.capacityRevision >= Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(ledger.migrationRevision) ||
      ledger.migrationRevision < 1) {
    throw new HttpsError("failed-precondition",
      "Seat capacity needs reconciliation before this edit.");
  }
  const reserved = ledger.occupied + heldSeatCount(ledger);
  if (!fitsSeatCapacity(next.capacity, reserved)) {
    throw new HttpsError("failed-precondition",
      "Capacity cannot be smaller than confirmed seats and checkout holds.");
  }
  const termsChanged = previous.termsConfigured &&
    previous.termsHash !== next.termsHash;
  if (previous.policyHash === next.policyHash) {
    return {update: null, reserved, termsChanged};
  }
  if (reserved > 0 && termsChanged) {
    throw new HttpsError("failed-precondition",
      "Events with reserved seats cannot change admission policy.");
  }
  return {reserved, termsChanged, update: {...ledger,
    capacity: next.capacity, policyHash: next.policyHash,
    policyVersion: next.policyVersion, revision: ledger.revision + 1,
    capacityRevision: ledger.capacityRevision + 1}};
}
