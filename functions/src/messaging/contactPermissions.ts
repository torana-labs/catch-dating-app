import type {
  CatchCommunicationPermissionReceiptDocument as CatchReceipt,
  CatchCommunicationPreferenceDocument as CatchPreference,
  ContactPermissionDocument,
  ContactPermissionReceiptDocument,
  GuestMessagingPermissionDocument,
  OrganizerCommunicationPermissionReceiptDocument as OrganizerReceipt,
  OrganizerCommunicationPreferenceDocument as OrganizerPreference,
} from "../shared/generated/firestoreAdminTypes";
import {
  effectiveOrganizerCommunicationStatus,
  effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId,
} from "../shared/organizerCommunicationPreferences";
import {effectiveFollowerWhatsappStatus} from
  "../organizers/organizerFollowerWhatsapp";
import {catchPermissionViewId, guestMessagingPermissionsCollection,
  summarizeWithReceipts, summaryReceiptIds} from
  "./guestMessagingPermissionStore";

/**
 * Contact permissions (issue #2460): one document per sender and person at
 * users/{uid}/contactPermissions/{senderKey}, and one append-only receipt
 * log, contactPermissionReceipts.
 *
 * Until the readers move (step 3), catchCommunicationPreferences and
 * organizerCommunicationPreferences stay the source of truth. Every writer
 * of those collections calls readContactPermissionState before its first
 * write and writeContactPermissionState with the preference it writes, so
 * the permission document, the receipt copy and the guest's
 * guestMessagingPermissions row change in the same transaction.
 */

export const contactPermissionsCollection = "contactPermissions";
export const contactPermissionReceiptsCollection = "contactPermissionReceipts";

export type ContactSender =
  | {kind: "catch"}
  | {kind: "organizer"; organizerId: string};
export type ContactGrantKey = ContactPermissionDocument["granted"][number];
export interface ContactGrant {
  status: "optedIn" | "optedOut";
  endpointE164: string | null;
  receiptId: string | null;
  termsVersion: string | null;
  source: OrganizerPreference["whatsapp"]["source"];
  updatedAt: FirebaseFirestore.Timestamp;
}
export type ContactPermission = Omit<ContactPermissionDocument, "grants"> & {
  grants: Partial<Record<ContactGrantKey, ContactGrant>>;
};
type Preference = CatchPreference | OrganizerPreference;
type Receipt = CatchReceipt | OrganizerReceipt;
type ChannelPreference = OrganizerPreference["whatsapp"];

/** catch, or organizer_{organizerId}. */
export function contactSenderKey(sender: ContactSender): string {
  return sender.kind === "catch" ? "catch" :
    `organizer_${sender.organizerId}`;
}

function senderId(sender: ContactSender): string {
  return sender.kind === "catch" ? "catch" : sender.organizerId;
}

/** The guest's permission document for one sender. */
export function contactPermissionRef(db: FirebaseFirestore.Firestore,
  uid: string, sender: ContactSender): FirebaseFirestore.DocumentReference {
  return db.collection("users").doc(uid)
    .collection(contactPermissionsCollection).doc(contactSenderKey(sender));
}

/** The contactPermissionReceipts copy of one old receipt, same id. */
export function contactPermissionReceipt(sender: ContactSender,
  receipt: Receipt, endpointE164?: string | null):
  ContactPermissionReceiptDocument {
  const fields: Record<string, unknown> = {...receipt};
  delete fields.organizerId;
  const endpoint = receipt.endpointE164 ?? endpointE164 ?? null;
  return {...fields as Omit<OrganizerReceipt, "organizerId">,
    senderKind: sender.kind, senderId: senderId(sender),
    ...(endpoint ? {endpointE164: endpoint} : {})};
}

/**
 * The permission document a preference stands for. Each channel:purpose
 * answer is what today's send gates compute for that purpose
 * (effectiveOrganizerWhatsappPurposeStatus, effectiveFollowerWhatsappStatus
 * and, for SMS, effectiveOrganizerCommunicationStatus), evaluated at the
 * number the grant was given for. An opt-in counts only for that number. A
 * withdrawal covers every number. A complete opt-in the gate does not
 * honour yet is kept as an answer but left out of granted.
 *
 * A channel-wide opt-in recorded without a number (registration before
 * #2460) takes its number from the receipt copy or from the current
 * document's answer for the same receipt; without one it is never granted.
 */
export function resolveContactPermission(params: {
  sender: ContactSender;
  preference: Preference;
  receipts?: ReadonlyMap<string, {endpointE164?: string} | undefined>;
  existing?: ContactPermission | null;
  now: FirebaseFirestore.Timestamp;
}): ContactPermission {
  const {sender, preference, now} = params;
  const fallbackAt = preference.updatedAt ?? now;
  const endpointOf = (key: ContactGrantKey, source: ChannelPreference) => {
    if (source.endpointE164) return source.endpointE164;
    const receiptId = source.currentReceiptId;
    if (!receiptId) return null;
    const fromReceipt = params.receipts?.get(receiptId)?.endpointE164;
    if (fromReceipt) return fromReceipt;
    const previous = params.existing?.grants[key];
    return previous?.receiptId === receiptId ? previous.endpointE164 : null;
  };
  const answer = (key: ContactGrantKey, source: ChannelPreference,
    status: "optedIn" | "optedOut"): ContactGrant | null => {
    if (status === "optedIn" &&
        (!source.currentReceiptId || source.source === null)) return null;
    return {status,
      endpointE164: status === "optedIn" ? endpointOf(key, source) : null,
      receiptId: source.currentReceiptId, termsVersion: source.termsVersion,
      source: source.source, updatedAt: source.updatedAt ?? fallbackAt};
  };
  const grants: ContactPermission["grants"] = {};
  const granted: ContactGrantKey[] = [];
  const keep = (key: ContactGrantKey, grant: ContactGrant | null,
    effective: boolean) => {
    if (!grant) return;
    grants[key] = grant;
    if (effective && grant.status === "optedIn" && grant.endpointE164) {
      granted.push(key);
    }
  };

  const purposes = sender.kind === "catch" ? ["marketing"] as const :
    ["eventOperations", "marketing", "followerUpdates"] as const;
  const broad = preference.whatsapp;
  const organizerPreference = preference as OrganizerPreference;
  for (const purpose of purposes) {
    const key = `whatsapp:${purpose}` as ContactGrantKey;
    const scoped = organizerPreference.whatsappPurposes?.[purpose];
    const endpoint = scoped ? endpointOf(key, scoped) :
      endpointOf(key, broad);
    const status = purpose === "followerUpdates" ?
      effectiveFollowerWhatsappStatus(organizerPreference, endpoint) :
      effectiveOrganizerWhatsappPurposeStatus(organizerPreference, purpose,
        endpoint, scoped?.sourceResponseId ?? null);
    if (status === "optedOut") {
      const broadWins = broad.status === "optedOut" &&
        (!scoped?.updatedAt || !broad.updatedAt ||
          broad.updatedAt.toMillis() >= scoped.updatedAt.toMillis());
      keep(key, answer(key, broadWins || !scoped ? broad : scoped,
        "optedOut"), false);
    } else if (status === "optedIn") {
      keep(key, answer(key, scoped?.status === "optedIn" ? scoped : broad,
        "optedIn"), true);
    } else if (scoped?.status === "optedIn" &&
        scoped.evidenceStatus === "complete") {
      keep(key, answer(key, scoped, "optedIn"), false);
    }
  }
  if (sender.kind === "organizer") {
    const sms = organizerPreference.sms;
    const status = effectiveOrganizerCommunicationStatus(organizerPreference,
      "sms");
    if (status !== "unknown") {
      keep("sms:marketing", answer("sms:marketing", sms, status),
        status === "optedIn");
    }
  }
  return {senderKind: sender.kind, senderId: senderId(sender), grants,
    granted: granted.sort(), updatedAt: now};
}

/** What a consent writer read before its first write. */
export interface ContactPermissionState {
  db: FirebaseFirestore.Firestore;
  uid: string;
  sender: ContactSender;
  existing: ContactPermission | null;
  receipts: Map<string, Receipt | undefined>;
}

/**
 * Reads what the permission document and the guest's row need: the current
 * permission document and the receipts the previous preference names. Call
 * it before the transaction's first write.
 */
export async function readContactPermissionState(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  params: {uid: string; sender: ContactSender; previous: Preference | null}):
  Promise<ContactPermissionState> {
  const collection = params.sender.kind === "catch" ?
    "catchCommunicationPermissionReceipts" :
    "organizerCommunicationPermissionReceipts";
  const ids = summaryReceiptIds(params.previous);
  const [existing, ...snaps] = await Promise.all([
    tx.get(contactPermissionRef(db, params.uid, params.sender)),
    ...ids.map((id) => tx.get(db.collection(collection).doc(id))),
  ]);
  const receipts = new Map<string, Receipt | undefined>();
  ids.forEach((id, index) => receipts.set(id,
    snaps[index].data() as Receipt | undefined));
  return {db, uid: params.uid, sender: params.sender,
    existing: (existing.data() as ContactPermission | undefined) ?? null,
    receipts};
}

/**
 * Writes the permission document for the preference the writer is saving,
 * a contactPermissionReceipts copy of each receipt it creates, and the
 * guest's guestMessagingPermissions row, in the writer's transaction.
 * Replayed receipts (created earlier) are passed with created false: they
 * count as evidence but are not written again.
 * @return {GuestMessagingPermissionDocument} The guest's row.
 */
export function writeContactPermissionState(
  tx: FirebaseFirestore.Transaction, state: ContactPermissionState,
  params: {
    next: Preference;
    receipts?: Array<{id: string; document: Receipt; created: boolean;
      endpointE164?: string | null}>;
    now: FirebaseFirestore.Timestamp;
  }): GuestMessagingPermissionDocument {
  const {db, uid, sender} = state;
  const receipts = new Map(state.receipts);
  const copies = new Map<string, ContactPermissionReceiptDocument>();
  for (const receipt of params.receipts ?? []) {
    receipts.set(receipt.id, receipt.document);
    const copy = contactPermissionReceipt(sender, receipt.document,
      receipt.endpointE164);
    copies.set(receipt.id, copy);
    if (receipt.created) {
      tx.create(db.collection(contactPermissionReceiptsCollection)
        .doc(receipt.id), copy);
    }
  }
  const permission = resolveContactPermission({sender,
    preference: params.next, receipts: copies, existing: state.existing,
    now: params.now});
  tx.set(contactPermissionRef(db, uid, sender), permission);
  const scope = sender.kind;
  const row: GuestMessagingPermissionDocument = {uid, scope,
    organizerId: sender.kind === "catch" ? null : sender.organizerId,
    preference: summarizeWithReceipts(params.next, scope, receipts),
    version: 1};
  tx.set(db.collection(guestMessagingPermissionsCollection).doc(
    sender.kind === "catch" ? catchPermissionViewId(uid) :
      organizerCommunicationPreferenceId(sender.organizerId, uid)), row);
  return row;
}

/**
 * The send gate the readers move to in step 3: the sender may use this
 * channel:purpose at this number only while the key is granted and the
 * grant names exactly that number.
 */
export function contactPermissionAllows(
  permission: Pick<ContactPermission, "grants" | "granted"> | null | undefined,
  key: ContactGrantKey, endpointE164: string | null | undefined): boolean {
  const grant = permission?.grants[key];
  return !!endpointE164 && !!grant && grant.status === "optedIn" &&
    permission!.granted.includes(key) && grant.endpointE164 === endpointE164;
}
