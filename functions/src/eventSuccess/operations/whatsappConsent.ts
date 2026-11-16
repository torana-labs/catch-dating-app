import type {EventWhatsappConsentReceiptDocument as ConsentReceipt} from
  "../../shared/generated/eventWhatsappConsentReceiptDocument";
import {validateEventWhatsappConsentReceiptDocument} from
  "../../shared/generated/validators/eventWhatsappConsentReceiptDocument";
import {operationContentHash} from "../../operations/durableActions";
import {Permission, whatsappSenderHash} from "./whatsappPermissionRecords";
import {EVENT_ASSISTANCE_CONSENT_RECEIPTS} from "./messageConsentCollections";

export type {ConsentReceipt};
export const WHATSAPP_CONSENT_RECEIPTS = EVENT_ASSISTANCE_CONSENT_RECEIPTS;
export const WHATSAPP_CONSENT_VERSION = "catch-event-service-whatsapp-v1";
export const WHATSAPP_CONSENT_TEXT =
  "Receive WhatsApp messages from the organizer shown here about joining, " +
  "changes and follow-up for this event, until 24 hours after it ends. " +
  "I can turn them off here.";
export const WHATSAPP_CONSENT_HASH = operationContentHash([
  WHATSAPP_CONSENT_VERSION, WHATSAPP_CONSENT_TEXT,
]);

export function parseWhatsappConsentReceipt(value: unknown): ConsentReceipt {
  if (!validateEventWhatsappConsentReceiptDocument(value) ||
      (value.decision === "grant" ?
        value.copyVersion !== WHATSAPP_CONSENT_VERSION ||
          value.copyHash !== WHATSAPP_CONSENT_HASH :
        value.copyVersion !== null || value.copyHash !== null)) {
    throw new Error("Invalid event WhatsApp consent receipt");
  }
  return value;
}

/** A consent proof is one dispatch prerequisite, never a send permit. */
export function whatsappPermissionHasReceipt(
  permission: Permission, receipt: ConsentReceipt | null
): boolean {
  return permission.status === "granted" && receipt !== null &&
    receipt.decision === "grant" &&
    permission.currentReceiptId === receipt.receiptId &&
    permission.evidence.receiptId === receipt.receiptId &&
    permission.evidence.subjectUid === receipt.actorUid &&
    permission.evidence.acceptedAt === receipt.createdAt &&
    permission.evidence.phoneVerifiedAt === receipt.createdAt &&
    permission.evidence.senderHash === receipt.senderHash &&
    receipt.senderHash === whatsappSenderHash(permission.context.organizerId,
      permission.senderId, permission.sender) &&
    permission.revision === receipt.appliedRevision &&
    permission.attendeeId === receipt.attendeeId &&
    permission.attendeeGeneration === receipt.attendeeGeneration &&
    permission.senderId === receipt.senderId &&
    permission.recipientEndpointId === receipt.recipientEndpointId &&
    operationContentHash(permission.context) ===
      operationContentHash(receipt.context) &&
    operationContentHash(permission) === receipt.permissionHash;
}
