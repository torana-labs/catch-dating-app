import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {GuestMessagingPermissionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {readPreference, summarize} from "./participantMessagingPreferences";

export const guestMessagingPermissionsCollection = "guestMessagingPermissions";

/** The view id of the guest's Catch row; organizer rows reuse source ids. */
export function catchPermissionViewId(uid: string): string {
  return `catchpref_${uid}`;
}

/** Which permission row a view id names, or null for a foreign id. */
export type PermissionRow =
  | {scope: "catch"; uid: string}
  | {scope: "organizer"; preferenceId: string};

/**
 * The guest's permission row for one sender, exactly as
 * listParticipantMessagingPreferences summarizes it, or null when the
 * guest has no preference document for that sender. Reads the preference
 * and the receipts it names in the transaction; never writes.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {PermissionRow} row The row to compute.
 * @return {Promise<GuestMessagingPermissionDocument|null>} The view.
 */
export async function guestMessagingPermission(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  row: PermissionRow): Promise<GuestMessagingPermissionDocument | null> {
  if (row.scope === "catch") {
    const snap = await tx.get(db.collection("catchCommunicationPreferences")
      .doc(row.uid));
    const value = readPreference(snap, row.uid, "catch", null);
    if (!value) return null;
    return {uid: row.uid, scope: "catch", organizerId: null,
      preference: await summarize(db, tx, value, "catch"), version: 1};
  }
  const snap = await tx.get(db.collection("organizerCommunicationPreferences")
    .doc(row.preferenceId));
  if (!snap.exists) return null;
  const {uid, organizerId} = snap.data() ?? {};
  if (typeof uid !== "string" || typeof organizerId !== "string" ||
      organizerCommunicationPreferenceId(organizerId, uid) !==
        row.preferenceId) {
    throw new Error("Messaging permission ownership is inconsistent.");
  }
  const value = readPreference(snap, uid, "organizer", organizerId);
  return {uid, scope: "organizer", organizerId,
    preference: await summarize(db, tx, value, "organizer"), version: 1};
}

function viewId(row: PermissionRow): string {
  return row.scope === "catch" ? catchPermissionViewId(row.uid) :
    row.preferenceId;
}

/**
 * Rewrites one permission view from current sources. A source that fails
 * its contract is logged and keeps its previous view rather than blocking a
 * trigger retry loop; the nightly data validation reports the document.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {PermissionRow} row The row to reconcile.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileGuestMessagingPermission(
  db: FirebaseFirestore.Firestore, row: PermissionRow): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(guestMessagingPermissionsCollection)
      .doc(viewId(row));
    const old = await tx.get(ref);
    let next: GuestMessagingPermissionDocument | null;
    try {
      next = await guestMessagingPermission(db, tx, row);
    } catch (error) {
      logger.warn("Guest messaging permission view kept a source that fails " +
        "its contract.", {viewId: ref.id,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * The rows a receipt write can change: the Catch row of its guest, or the
 * guest's row for its organizer.
 * @param {"catch"|"organizer"} scope The receipt collection's scope.
 * @param {FirebaseFirestore.DocumentData|undefined} data Receipt data.
 * @return {PermissionRow|null} The row, or null without an owner.
 */
export function receiptPermissionRow(scope: "catch" | "organizer",
  data: FirebaseFirestore.DocumentData | undefined): PermissionRow | null {
  const uid = data?.uid;
  if (typeof uid !== "string" || !uid) return null;
  if (scope === "catch") return {scope, uid};
  const organizerId = data?.organizerId;
  if (typeof organizerId !== "string" || !organizerId) return null;
  return {scope, preferenceId:
    organizerCommunicationPreferenceId(organizerId, uid)};
}
