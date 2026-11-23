import {HttpsError} from "firebase-functions/v2/https";
import type {CatchCommunicationPermissionReceiptDocument as CatchReceipt,
  CatchCommunicationPreferenceDocument as CatchPreference,
  GuestMessagingPermissionDocument,
  OrganizerCommunicationPermissionReceiptDocument as OrganizerReceipt,
  OrganizerCommunicationPreferenceDocument as OrganizerPreference} from
  "../shared/generated/firestoreAdminTypes";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {requireDoc} from "../shared/validation";
import type {ListParticipantMessagingPreferencesCallableResponse as Page} from
  "../shared/generated/listParticipantMessagingPreferencesCallableResponse";

/**
 * The guest-readable copy of each WhatsApp permission row on the guest's
 * messaging settings page, kept until the guest minimum-build floor passes a
 * build that reads contactPermissions (issue #2460). Consent writers write
 * it in their own transaction through writeContactPermissionState.
 */
export const guestMessagingPermissionsCollection = "guestMessagingPermissions";

export type Preference = CatchPreference | OrganizerPreference;
export type Scope = "catch" | "organizer";

/** The view id of the guest's Catch row; organizer rows reuse source ids. */
export function catchPermissionViewId(uid: string): string {
  return `catchpref_${uid}`;
}

/** A stored preference checked against its contract and its owner. */
export function readPreference(
  snap: FirebaseFirestore.DocumentSnapshot, uid: string,
  scope: Scope, organizerId: string | null): Preference | null {
  if (!snap.exists) return null;
  const value = scope === "catch" ?
    requireDoc<CatchPreference>(snap, "CatchCommunicationPreferenceDocument") :
    requireDoc<OrganizerPreference>(snap,
      "OrganizerCommunicationPreferenceDocument");
  if (value.uid !== uid || (scope === "organizer" &&
      (value as OrganizerPreference).organizerId !== organizerId)) {
    throw new HttpsError("failed-precondition",
      "Messaging permission ownership is inconsistent.");
  }
  return value;
}

/** Which permission row a view id names. */
export type PermissionRow =
  | {scope: "catch"; uid: string}
  | {scope: "organizer"; preferenceId: string};

/**
 * The guest's permission row for one sender from the stored preference and
 * the receipts it names, or null when the guest has no preference document
 * for that sender. Reads in the transaction; never writes. Consent writers
 * write the row themselves; the guest-messaging-permissions migration uses
 * this to copy rows forward.
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

export type PermissionReceipt = CatchReceipt | OrganizerReceipt;

/** The receipt ids summarize may read for a preference. */
export function summaryReceiptIds(value: Preference | null): string[] {
  const ids = [value?.whatsapp.currentReceiptId ?? null,
    ...(["eventOperations", "marketing", "followerUpdates"] as const)
      .map((purpose) => (value as OrganizerPreference | null)
        ?.whatsappPurposes?.[purpose]?.currentReceiptId ?? null)];
  return [...new Set(ids.filter((id): id is string => !!id))];
}

/**
 * The participant's WhatsApp permission summary for one sender, as the
 * settings page shows it; also kept on guestMessagingPermissions. Reads the
 * receipts the preference names in the transaction.
 */
export async function summarize(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, value: Preference | null, scope: Scope):
  Promise<Page["catchPreference"]> {
  const collection = scope === "catch" ?
    "catchCommunicationPermissionReceipts" :
    "organizerCommunicationPermissionReceipts";
  const receipts = new Map<string, PermissionReceipt | undefined>();
  for (const id of summaryReceiptIds(value)) {
    receipts.set(id, (await tx.get(db.collection(collection).doc(id)))
      .data() as PermissionReceipt | undefined);
  }
  return summarizeWithReceipts(value, scope, receipts);
}

/**
 * The same summary from receipts already in hand, so a writer can project
 * the guest's row in the transaction that changes the preference. A receipt
 * missing from the map counts as missing evidence.
 */
export function summarizeWithReceipts(value: Preference | null, scope: Scope,
  receipts: ReadonlyMap<string, PermissionReceipt | undefined>):
  Page["catchPreference"] {
  const channel = value?.whatsapp;
  const receiptId = channel?.currentReceiptId ?? null;
  const purposes: NonNullable<Page["catchPreference"]["purposes"]> = {};
  // Follower updates (organizer WhatsApp follow-by-phone) count towards the
  // organizer's overall status so a follower can withdraw it here, but the
  // listed purposes stay the two the settings page names.
  const followerUpdates: typeof purposes = {};
  for (const purpose of ["eventOperations", "marketing",
    "followerUpdates"] as const) {
    if (scope === "catch" && purpose !== "marketing") continue;
    const target = purpose === "followerUpdates" ? followerUpdates :
      purposes;
    const scoped = value?.whatsappPurposes?.[purpose];
    if (!scoped) continue;
    const scopedReceiptId = scoped.currentReceiptId;
    if (scoped.status === "optedOut" ||
        (channel?.status === "optedOut" && channel.updatedAt &&
          (!scoped.updatedAt ||
            channel.updatedAt.toMillis() >= scoped.updatedAt.toMillis()))) {
      target[purpose === "followerUpdates" ? "marketing" : purpose] =
        {status: "optedOut", receiptId: scopedReceiptId};
      continue;
    }
    const scopedReceipt = scopedReceiptId ?
      receipts.get(scopedReceiptId) : undefined;
    target[purpose === "followerUpdates" ? "marketing" : purpose] = {status:
      scoped.status === "optedIn" && scoped.evidenceStatus === "complete" &&
      scopedReceipt?.uid === value?.uid &&
      scopedReceipt?.purpose === purpose &&
      scopedReceipt?.endpointE164 === scoped.endpointE164 &&
      (scopedReceipt?.sourceResponseId ?? null) ===
        (scoped.sourceResponseId ?? null) &&
      scopedReceipt?.decision === "optedIn" &&
      scopedReceipt?.evidenceStatus === "complete" &&
      typeof scopedReceipt?.consentCopyHash === "string" &&
      /^[a-f0-9]{64}$/u.test(scopedReceipt.consentCopyHash) &&
      scopedReceipt?.revokedAt === null &&
      (scope === "catch" || (scopedReceipt as OrganizerReceipt)
        .organizerId === (value as OrganizerPreference).organizerId) ?
        "optedIn" : "unknown", receiptId: scopedReceiptId};
  }
  const firstActive = purposes.eventOperations?.status === "optedIn" ?
    purposes.eventOperations : purposes.marketing?.status === "optedIn" ?
      purposes.marketing : followerUpdates.marketing?.status === "optedIn" ?
        followerUpdates.marketing : null;
  if (firstActive) {
    return {status: "optedIn", receiptId: firstActive.receiptId, purposes};
  }
  if (channel?.status === "optedOut") {
    return {status: "optedOut", receiptId, purposes};
  }
  if (!value || channel?.status !== "optedIn" ||
      channel.evidenceStatus !== "complete" || !receiptId) {
    return {status: "unknown", receiptId, purposes};
  }
  const receipt = receipts.get(receiptId);
  const complete = receipt?.uid === value.uid &&
    receipt.channel === "whatsapp" && receipt.decision === "optedIn" &&
    receipt.evidenceStatus === "complete" &&
    receipt.termsVersion === channel.termsVersion &&
    typeof receipt.consentCopyHash === "string" &&
    /^[a-f0-9]{64}$/u.test(receipt.consentCopyHash) &&
    receipt.grantedAt != null && receipt.revokedAt === null &&
    (scope === "catch" || (receipt as OrganizerReceipt).organizerId ===
      (value as OrganizerPreference).organizerId);
  return {status: complete ? "optedIn" : "unknown", receiptId, purposes};
}
