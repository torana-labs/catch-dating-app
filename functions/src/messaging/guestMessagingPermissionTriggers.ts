import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {receiptPermissionRow, reconcileGuestMessagingPermission,
  type PermissionRow} from "./guestMessagingPermissionStore";

const options = {retry: true};

async function reconcileAll(rows: Array<PermissionRow | null>) {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row) continue;
    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    await reconcileGuestMessagingPermission(admin.firestore(), row);
  }
}

/** The guest's Catch row follows their Catch preference. */
export const onGuestMessagingPermissionCatchPreferenceChanged =
  onDocumentWritten({...options,
    document: "catchCommunicationPreferences/{uid}"},
  (event) => reconcileAll([{scope: "catch", uid: event.params.uid}]));

/** An organizer row follows its preference document. */
export const onGuestMessagingPermissionOrganizerPreferenceChanged =
  onDocumentWritten({...options,
    document: "organizerCommunicationPreferences/{preferenceId}"},
  (event) => reconcileAll([{scope: "organizer",
    preferenceId: event.params.preferenceId}]));

/** A Catch receipt's validity changes its guest's Catch row. */
export const onGuestMessagingPermissionCatchReceiptChanged =
  onDocumentWritten({...options,
    document: "catchCommunicationPermissionReceipts/{receiptId}"},
  (event) => reconcileAll([
    receiptPermissionRow("catch", event.data?.before.data()),
    receiptPermissionRow("catch", event.data?.after.data())]));

/** An organizer receipt's validity changes its guest's organizer row. */
export const onGuestMessagingPermissionOrganizerReceiptChanged =
  onDocumentWritten({...options,
    document: "organizerCommunicationPermissionReceipts/{receiptId}"},
  (event) => reconcileAll([
    receiptPermissionRow("organizer", event.data?.before.data()),
    receiptPermissionRow("organizer", event.data?.after.data())]));
