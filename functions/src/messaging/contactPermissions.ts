import type {GuestMessagingPermissionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  contactPermissionReceiptRef,
  contactPermissionRef,
  contactSenderId,
  effectiveContactKeys,
  readContactPermission,
  type ContactGrant,
  type ContactGrantKey,
  type ContactPermission,
  type ContactPermissionReceipt,
  type ContactSender,
} from "../shared/contactPermissions";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {catchPermissionViewId, guestMessagingPermissionsCollection,
  guestPermissionSummary} from "./guestMessagingPermissionStore";

/**
 * The write side of contact permissions (issue #2460). Every consent writer
 * (registration, follow by phone, form submission and promotion, inbound
 * STOP, withdrawal) reads the sender's permission with
 * readContactPermissionState before its first write, then calls
 * writeContactPermissionState with the grants it changes. In the same
 * transaction that writes the receipts, the permission document and the
 * guest's guestMessagingPermissions row, which released Catch builds read
 * until the guest minimum-build floor moves.
 */

/** What a consent writer read before its first write. */
export interface ContactPermissionState {
  db: FirebaseFirestore.Firestore;
  uid: string;
  sender: ContactSender;
  existing: ContactPermission | null;
}

/** Reads the sender's current permission. Call before any write. */
export async function readContactPermissionState(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  params: {uid: string; sender: ContactSender}):
  Promise<ContactPermissionState> {
  const snap = await tx.get(contactPermissionRef(db, params.uid,
    params.sender));
  return {db, uid: params.uid, sender: params.sender,
    existing: readContactPermission(snap.data(), params.sender)};
}

/** The grant a receipt records for one key. */
export function grantFromReceipt(receipt: ContactPermissionReceipt,
  receiptId: string, decidedAt: FirebaseFirestore.Timestamp): ContactGrant {
  return {status: receipt.decision,
    endpointE164: receipt.decision === "optedIn" ?
      receipt.endpointE164 ?? null : null,
    receiptId, termsVersion: receipt.termsVersion, source: receipt.source,
    updatedAt: decidedAt};
}

/** The permission after applying grant changes; granted is recomputed. */
export function nextContactPermission(state: ContactPermissionState,
  changes: Partial<Record<ContactGrantKey, ContactGrant>>,
  now: FirebaseFirestore.Timestamp): ContactPermission {
  const grants = {...(state.existing?.grants ?? {}), ...changes};
  return {senderKind: state.sender.kind, senderId: contactSenderId(
    state.sender), grants, granted: effectiveContactKeys(grants),
  updatedAt: now};
}

/**
 * Creates the receipts, writes the permission and the guest's settings row
 * in the writer's transaction.
 * @return {GuestMessagingPermissionDocument} The guest's row.
 */
export function writeContactPermissionState(
  tx: FirebaseFirestore.Transaction, state: ContactPermissionState,
  params: {next: ContactPermission;
    receipts?: Array<{id: string; document: ContactPermissionReceipt}>}):
  GuestMessagingPermissionDocument {
  const {db, uid, sender} = state;
  for (const receipt of params.receipts ?? []) {
    tx.create(contactPermissionReceiptRef(db, receipt.id), receipt.document);
  }
  tx.set(contactPermissionRef(db, uid, sender), params.next);
  const row: GuestMessagingPermissionDocument = {uid, scope: sender.kind,
    organizerId: sender.kind === "catch" ? null : sender.organizerId,
    preference: guestPermissionSummary(params.next, sender.kind),
    version: 1};
  tx.set(db.collection(guestMessagingPermissionsCollection).doc(
    sender.kind === "catch" ? catchPermissionViewId(uid) :
      organizerCommunicationPreferenceId(sender.organizerId, uid)), row);
  return row;
}
