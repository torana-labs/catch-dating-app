import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {FirestoreSeatIdentityAuthority, prepareCatchUidSeatIdentity} from
  "../events/seatIdentityAuthority";
import {assertCurrentReadySeatSnapshot, FirestoreSeatTransaction} from
  "../events/seatAuthority/firestoreAdapter";
import {heldSeatCount} from "../events/seatAuthority/seatAuthority";
import {applyTemporaryHold, prepareTemporaryHold,
  TemporaryHoldOperation} from "../events/seatAuthority/temporarySeatHold";

/** Read-only pair transition. The caller validates invitation, policy,
 * participants and free/captured payment authority in this same transaction.
 * The persisted UID proof and hold owner bind cleanup without requiring the
 * departing user's Auth account to remain accessible.
 */
export async function preparePairSeatTransition(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  event: unknown;
  eventId: string;
  organizerId: string;
  requesterUid: string;
  holdId: string;
  expiresAtMillis: number;
  nowMillis: number;
  operation: TemporaryHoldOperation;
  loadCurrentAuthPhone?: (uid: string) => Promise<string | null>;
}): Promise<{reservedCount: number; apply: () => void}> {
  const {db, tx, eventId, organizerId, requesterUid, operation} = params;
  const releasing = operation === "releaseTemporaryHold";
  if (!releasing && (await tx.get(db.collection("deletedUsers")
    .doc(requesterUid))).exists) {
    throw new HttpsError("failed-precondition", "Account is unavailable.");
  }
  const preparedIdentity = releasing ? null :
    await prepareCatchUidSeatIdentity({db, tx, eventId, organizerId,
      uid: requesterUid, currentAuthPhoneNumber:
        params.loadCurrentAuthPhone ?
          await params.loadCurrentAuthPhone(requesterUid) :
          (await admin.auth().getUser(requesterUid)).phoneNumber ?? null});
  const identity = preparedIdentity?.identity ??
    await new FirestoreSeatIdentityAuthority().resolve({db, tx, eventId,
      organizerId, subject: {kind: "verifiedUid", uid: requesterUid}});
  if (!identity) {
    throw new HttpsError("failed-precondition",
      "Pair seat identity needs reconciliation.");
  }
  const seats = new FirestoreSeatTransaction(db, tx);
  const [ledger, reservation] = await Promise.all([
    seats.ledger(eventId), seats.reservation(eventId, identity.key),
  ]);
  assertCurrentReadySeatSnapshot({event: params.event, eventId,
    organizerId, identity, ledger, reservation});
  if (!ledger) {
    throw new HttpsError("failed-precondition",
      "Pair seat inventory needs reconciliation.");
  }
  const plan = await prepareTemporaryHold({tx: seats,
    resolveIdentity: async () => identity,
    command: {eventId, subject: requesterUid, operation,
      ownerKind: "crossPathsPair", ownerId: params.holdId,
      expiresAtMillis: params.expiresAtMillis,
      requestId: `${operation}_${params.holdId}`,
      expectedLedgerRevision: ledger.revision,
      expectedCapacityRevision: ledger.capacityRevision,
      expectedMigrationRevision: ledger.migrationRevision,
      expectedReservationRevision: reservation?.revision ?? 0,
      nowMillis: params.nowMillis}});
  return {reservedCount: ledger.occupied + heldSeatCount(ledger),
    apply: () => {
      applyTemporaryHold(seats, plan);
      preparedIdentity?.apply();
    }};
}
