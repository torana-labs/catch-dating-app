import type {EventAssistanceSmsPermissionDocument as Permission} from
  "../../shared/generated/eventAssistanceSmsPermissionDocument";
import type {EventAssistanceSmsConsentReceiptDocument as ConsentReceipt} from
  "../../shared/generated/eventAssistanceSmsConsentReceiptDocument";
import {validateEventAssistanceSmsConsentReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceSmsConsentReceiptDocument";
import {operationContentHash} from "../../operations/durableActions";
import {EVENT_ASSISTANCE_CONSENT_RECEIPTS} from
  "./messageConsentCollections";

export type {ConsentReceipt};
// Stable Catch identity; rotating provider credentials never changes consent.
export const CATCH_EVENT_SMS_SENDER_ID = "catch-event-sms";
export const SMS_CONSENT_RECEIPTS = EVENT_ASSISTANCE_CONSENT_RECEIPTS;
export const SMS_CONSENT_VERSION = "catch-event-service-sms-v1";
export const SMS_CONSENT_TEXT =
  "Receive text messages from Catch about joining, changes and follow-up " +
  "for this event, until 24 hours after it ends. I can turn them off here.";
export const SMS_CONSENT_HASH = operationContentHash([
  SMS_CONSENT_VERSION, SMS_CONSENT_TEXT,
]);

export function parseSmsConsentReceipt(value: unknown): ConsentReceipt {
  if (!validateEventAssistanceSmsConsentReceiptDocument(value) ||
      (value.decision === "grant" ?
        value.source !== "verifiedParticipant" ||
          value.copyVersion !== SMS_CONSENT_VERSION ||
          value.copyHash !== SMS_CONSENT_HASH :
        value.copyVersion !== null || value.copyHash !== null)) {
    throw new Error("Invalid event SMS consent receipt");
  }
  return value;
}

/** Permission data alone is insufficient: require the exact immutable grant. */
export function smsPermissionHasReceipt(
  permission: Permission, receipt: ConsentReceipt | null
): boolean {
  return permission.status === "granted" && receipt !== null &&
    receipt.decision === "grant" && receipt.source === "verifiedParticipant" &&
    permission.currentReceiptId === receipt.receiptId &&
    permission.evidence.receiptId === receipt.receiptId &&
    permission.evidence.subjectUid === receipt.actorUid &&
    permission.evidence.acceptedAt === receipt.createdAt &&
    permission.evidence.phoneVerifiedAt === receipt.createdAt &&
    permission.revision === receipt.appliedRevision &&
    permission.attendeeId === receipt.attendeeId &&
    permission.attendeeGeneration === receipt.attendeeGeneration &&
    permission.senderId === receipt.senderId &&
    permission.recipientEndpointId === receipt.recipientEndpointId &&
    operationContentHash(permission.context) ===
      operationContentHash(receipt.context) &&
    operationContentHash(permission) === receipt.permissionHash;
}
