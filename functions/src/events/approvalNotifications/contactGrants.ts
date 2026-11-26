import {Timestamp} from "firebase-admin/firestore";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash as hash} from "../../operations/durableActions";
import type {EventApprovalPreferenceDocument as Preference} from
  "../../shared/generated/eventApprovalPreferenceDocument";
import {validateEventApprovalPreferenceDocument as validPreference} from
  "../../shared/generated/validators/eventApprovalPreferenceDocument";
import {
  contactPermissionReceiptRef,
  EmailBookingUpdatesGrant,
  eventContactPermissionRef,
  EventContactGrants,
  EventContactReceipt,
  PhoneBookingUpdatesGrant,
  readEventContactPermission,
  readEventContactReceipt,
  storedMillis,
} from "../../shared/eventContactPermissions";
import {preferenceId, terms} from "./model";

/**
 * Approval-notification choices as grants in the guest's event document
 * (issue #2494): phone:bookingUpdates (WhatsApp with SMS fallback, as the
 * one phone choice always covered) and email:bookingUpdates. Each choice
 * revision writes both grants and one receipt for each. The preference the
 * approval gate always read rebuilds exactly from the two grants.
 */
type Channel = "phone" | "email";
export type BookingUpdatesReceipt = Omit<EventContactReceipt,
  "supersedesReceiptId">;

const legacyReceiptId = (eventId: string, uid: string, revision: number) =>
  "eapr_" + hash([preferenceId(eventId, uid), revision]);
/** One receipt per channel and revision, beside the old revision receipt. */
export const bookingUpdatesReceiptId = (eventId: string, uid: string,
  revision: number, channel: Channel) =>
  `${legacyReceiptId(eventId, uid, revision)}:${channel}`;
const copyHash = (channel: Channel) => hash([terms.version, terms[channel]]);

/** The two grants and receipts for one approval-notification revision. */
export function bookingUpdatesFromPreference(preference: Preference): {
  grants: EventContactGrants;
  receipts: Array<{key: "phone:bookingUpdates" | "email:bookingUpdates";
    receiptId: string; receipt: BookingUpdatesReceipt}>;
} {
  const {eventId, uid, revision} = preference;
  const updatedAt = Timestamp.fromMillis(preference.updatedAtMillis);
  const common = {termsVersion: terms.version,
    source: "participantSettings" as const, updatedAt, revision};
  const phone: PhoneBookingUpdatesGrant = {...common,
    status: preference.choices.phoneUpdates ? "optedIn" : "optedOut",
    endpointE164: preference.phoneE164,
    receiptId: bookingUpdatesReceiptId(eventId, uid, revision, "phone")};
  const email: EmailBookingUpdatesGrant = {...common,
    status: preference.choices.emailUpdates ? "optedIn" : "optedOut",
    email: preference.email,
    receiptId: bookingUpdatesReceiptId(eventId, uid, revision, "email")};
  const receipt = (channel: Channel, optedIn: boolean,
    endpoint: Record<string, string>): BookingUpdatesReceipt => ({
    senderKind: "event", senderId: eventId, uid,
    organizerId: preference.organizerId, channel, purpose: "bookingUpdates",
    decision: optedIn ? "optedIn" : "optedOut", evidenceStatus: "complete",
    termsVersion: terms.version, consentCopyHash: copyHash(channel),
    source: "participantSettings", sourceEventId: eventId,
    sourceFormId: null, sourceResponseId: null, sourceProviderEventId: null,
    actorClass: "participant", actorUid: uid,
    identityStrength: channel === "phone" ? "phoneVerified" : "emailVerified",
    grantedAt: optedIn ? updatedAt : null,
    revokedAt: optedIn ? null : updatedAt,
    createdAt: updatedAt, ...endpoint,
    event: {appliedRevision: revision},
  });
  return {
    grants: {"phone:bookingUpdates": phone, "email:bookingUpdates": email},
    receipts: [
      {key: "phone:bookingUpdates", receiptId: phone.receiptId,
        receipt: receipt("phone", phone.status === "optedIn",
          phone.endpointE164 ? {endpointE164: phone.endpointE164} : {})},
      {key: "email:bookingUpdates", receiptId: email.receiptId,
        receipt: receipt("email", email.status === "optedIn",
          email.email ? {endpointEmail: email.email} : {})},
    ],
  };
}

function receiptCovers(receipt: EventContactReceipt | null, uid: string,
  channel: Channel, grant: PhoneBookingUpdatesGrant |
    EmailBookingUpdatesGrant): boolean {
  const endpoint = "email" in grant ? grant.email : grant.endpointE164;
  return receipt !== null && receipt.uid === uid &&
    receipt.channel === channel && receipt.purpose === "bookingUpdates" &&
    receipt.decision === grant.status &&
    receipt.event?.appliedRevision === grant.revision &&
    storedMillis(receipt.createdAt) === storedMillis(grant.updatedAt) &&
    (channel === "phone" ? receipt.endpointE164 : receipt.endpointEmail) ===
      (endpoint ?? undefined);
}

/**
 * The guest's approval-notification preference for one event, rebuilt from
 * the event document's two grants, or null when there is none or a grant
 * lacks the receipt that proves it.
 */
export async function readBookingUpdatesPreference(db: Firestore,
  tx: Transaction, uid: string, eventId: string): Promise<Preference | null> {
  const snap = await tx.get(eventContactPermissionRef(db, uid, eventId));
  let phone: PhoneBookingUpdatesGrant | undefined;
  let email: EmailBookingUpdatesGrant | undefined;
  let organizerId: string;
  try {
    const document = readEventContactPermission(snap.data(), eventId);
    if (!document) return null;
    phone = document.grants["phone:bookingUpdates"];
    email = document.grants["email:bookingUpdates"];
    organizerId = document.organizerId;
  } catch {
    return null;
  }
  if (!phone || !email || phone.revision !== email.revision ||
      storedMillis(phone.updatedAt) !== storedMillis(email.updatedAt) ||
      phone.receiptId !== bookingUpdatesReceiptId(eventId, uid,
        phone.revision, "phone") ||
      email.receiptId !== bookingUpdatesReceiptId(eventId, uid,
        email.revision, "email")) return null;
  const [phoneReceipt, emailReceipt] = await tx.getAll(
    contactPermissionReceiptRef(db, phone.receiptId),
    contactPermissionReceiptRef(db, email.receiptId));
  if (!receiptCovers(readEventContactReceipt(phoneReceipt.data(), eventId),
    uid, "phone", phone) ||
      !receiptCovers(readEventContactReceipt(emailReceipt.data(), eventId),
        uid, "email", email)) return null;
  const preference: Preference = {
    eventId, organizerId, uid, revision: phone.revision,
    choices: {phoneUpdates: phone.status === "optedIn",
      emailUpdates: email.status === "optedIn"},
    phoneE164: phone.endpointE164, email: email.email,
    termsVersion: terms.version,
    receiptId: legacyReceiptId(eventId, uid, phone.revision),
    updatedAtMillis: storedMillis(phone.updatedAt),
  };
  return validPreference(preference) ? preference : null;
}
