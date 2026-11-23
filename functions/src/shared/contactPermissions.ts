import type {
  ContactPermissionDocument,
  ContactPermissionReceiptDocument,
} from "./generated/firestoreAdminTypes";
import type {ListParticipantMessagingPreferencesCallableResponse as Page} from
  "./generated/listParticipantMessagingPreferencesCallableResponse";

/**
 * Contact permissions (issue #2460): the single answer to whether a sender
 * may message a person, at users/{uid}/contactPermissions/{senderKey}, and
 * the one append-only receipt log, contactPermissionReceipts.
 *
 * This module is the read side every send gate, audience and settings view
 * uses. Only the messaging context writes the documents
 * (functions/src/messaging/contactPermissions.ts).
 */

export const contactPermissionsCollection = "contactPermissions";
export const contactPermissionReceiptsCollection = "contactPermissionReceipts";

export type ContactSender =
  | {kind: "catch"}
  | {kind: "organizer"; organizerId: string};
export type ContactGrantKey = ContactPermissionDocument["granted"][number];
export type ContactPermissionReceipt = ContactPermissionReceiptDocument;
export type ContactSource = ContactPermissionReceiptDocument["source"];
export interface ContactGrant {
  status: "optedIn" | "optedOut";
  endpointE164: string | null;
  receiptId: string | null;
  termsVersion: string | null;
  source: ContactSource | null;
  updatedAt: FirebaseFirestore.Timestamp;
}
export type ContactPermission = Omit<ContactPermissionDocument, "grants"> & {
  grants: Partial<Record<ContactGrantKey, ContactGrant>>;
};

/** Every WhatsApp purpose an organizer may hold; Catch has marketing only. */
export const organizerWhatsappKeys = ["whatsapp:eventOperations",
  "whatsapp:marketing", "whatsapp:followerUpdates"] as const;

/** Form copy that is captured but not yet approved for sending. */
const unreviewedFormTerms = new Set(["form-whatsapp-v1", "form-whatsapp-v2"]);
/** The reviewed follow-by-phone copy (organizerFollowerWhatsapp). */
const followerTerms = "follower-whatsapp-v1";

/** catch, or organizer_{organizerId}. */
export function contactSenderKey(sender: ContactSender): string {
  return sender.kind === "catch" ? "catch" :
    `organizer_${sender.organizerId}`;
}

/** catch for Catch itself, otherwise the organizer id. */
export function contactSenderId(sender: ContactSender): string {
  return sender.kind === "catch" ? "catch" : sender.organizerId;
}

/** The guest's permission document for one sender. */
export function contactPermissionRef(db: FirebaseFirestore.Firestore,
  uid: string, sender: ContactSender): FirebaseFirestore.DocumentReference {
  return db.collection("users").doc(uid)
    .collection(contactPermissionsCollection).doc(contactSenderKey(sender));
}

/** One receipt in the append-only log. */
export function contactPermissionReceiptRef(db: FirebaseFirestore.Firestore,
  receiptId: string): FirebaseFirestore.DocumentReference {
  return db.collection(contactPermissionReceiptsCollection).doc(receiptId);
}

/**
 * The stored permission for one sender, or null when there is none or it
 * names another sender. No document means no consent.
 */
export function readContactPermission(
  data: FirebaseFirestore.DocumentData | undefined,
  sender: ContactSender): ContactPermission | null {
  if (!data || data.senderKind !== sender.kind ||
      data.senderId !== contactSenderId(sender) ||
      typeof data.grants !== "object" || data.grants === null ||
      !Array.isArray(data.granted)) return null;
  return data as ContactPermission;
}

/**
 * Whether a recorded opt-in is effective: it names a number and a receipt,
 * and its copy is approved for that purpose. Form copy awaits provider
 * review, and follower updates need the reviewed follow-by-phone copy.
 */
export function contactGrantIsEffective(key: ContactGrantKey,
  grant: ContactGrant | undefined): boolean {
  if (!grant || grant.status !== "optedIn" || !grant.endpointE164 ||
      !grant.receiptId || !grant.source) return false;
  if (grant.source === "hostFormResponse" &&
      unreviewedFormTerms.has(grant.termsVersion ?? "")) return false;
  if (key === "whatsapp:followerUpdates") {
    return grant.source === "organizerFollowByPhone" &&
      grant.termsVersion === followerTerms;
  }
  return true;
}

/** The sorted keys whose grants are effective now. */
export function effectiveContactKeys(
  grants: ContactPermission["grants"]): ContactGrantKey[] {
  return (Object.keys(grants) as ContactGrantKey[])
    .filter((key) => contactGrantIsEffective(key, grants[key])).sort();
}

/**
 * The send gate: the sender may use this channel:purpose at this number only
 * while the key is granted and the grant names exactly that number.
 */
export function contactPermissionAllows(
  permission: Pick<ContactPermission, "grants" | "granted"> | null | undefined,
  key: ContactGrantKey, endpointE164: string | null | undefined): boolean {
  const grant = permission?.grants[key];
  return !!endpointE164 && !!grant && grant.status === "optedIn" &&
    permission!.granted.includes(key) && grant.endpointE164 === endpointE164;
}

/**
 * The three-way answer audiences and suppression reasons need: a withdrawal
 * is optedOut at every number, an allowed grant is optedIn, and anything
 * else (no grant, another number, an unapproved copy) is unknown.
 */
export function contactPermissionStatus(
  permission: Pick<ContactPermission, "grants" | "granted"> | null | undefined,
  key: ContactGrantKey, endpointE164: string | null | undefined):
  "optedIn" | "optedOut" | "unknown" {
  if (permission?.grants[key]?.status === "optedOut") return "optedOut";
  return contactPermissionAllows(permission, key, endpointE164) ?
    "optedIn" : "unknown";
}

/**
 * Whether the guest stopped every WhatsApp message from Catch, not only its
 * marketing: the withdrawal's receipt names no purpose (a sender-wide
 * settings withdrawal). Service replies honour only this. An unreadable or
 * missing receipt fails closed.
 */
export async function catchWithdrewAllWhatsapp(
  read: (ref: FirebaseFirestore.DocumentReference) =>
    Promise<FirebaseFirestore.DocumentSnapshot>,
  db: FirebaseFirestore.Firestore,
  permission: Pick<ContactPermission, "grants">): Promise<boolean> {
  const grant = permission.grants["whatsapp:marketing"];
  if (grant?.status !== "optedOut") return false;
  if (!grant.receiptId) return true;
  const receipt = (await read(contactPermissionReceiptRef(db,
    grant.receiptId))).data() as ContactPermissionReceipt | undefined;
  return !receipt || receipt.senderKind !== "catch" || !receipt.purpose;
}

type Summary = Page["catchPreference"];

/**
 * The participant's WhatsApp permission summary for one sender, as the
 * settings page shows it and a withdrawal returns it: each listed purpose's
 * recorded answer and the receipt that fences a withdrawal. Follower updates
 * count towards the organizer's overall status so a follower can withdraw
 * them, but the listed purposes stay the two the settings page names.
 */
export function whatsappPermissionSummary(
  permission: Pick<ContactPermission, "grants"> | null,
  scope: "catch" | "organizer"): Summary {
  const grants = permission?.grants ?? {};
  const purposes: NonNullable<Summary["purposes"]> = {};
  const listed = scope === "catch" ? ["marketing"] as const :
    ["eventOperations", "marketing"] as const;
  for (const purpose of listed) {
    const grant = grants[`whatsapp:${purpose}`];
    if (grant) purposes[purpose] = {status: grant.status,
      receiptId: grant.receiptId};
  }
  const whatsapp: ContactGrant[] = [
    ...listed.map((purpose) => grants[`whatsapp:${purpose}`]),
    scope === "organizer" ? grants["whatsapp:followerUpdates"] : undefined,
  ].filter((grant): grant is ContactGrant => !!grant);
  const active = whatsapp.find((grant) => grant.status === "optedIn");
  if (active) {
    return {status: "optedIn", receiptId: active.receiptId, purposes};
  }
  const withdrawal = whatsapp.filter((grant) => grant.status === "optedOut")
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())[0];
  if (withdrawal) {
    return {status: "optedOut", receiptId: withdrawal.receiptId, purposes};
  }
  return {status: "unknown", receiptId: null, purposes};
}
