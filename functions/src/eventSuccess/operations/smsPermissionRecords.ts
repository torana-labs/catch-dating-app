import type {EventAssistanceSmsPermissionDocument as Permission} from
  "../../shared/generated/eventAssistanceSmsPermissionDocument";
import {validateEventAssistanceSmsPermissionDocument} from
  "../../shared/generated/validators/eventAssistanceSmsPermissionDocument";
import {operationContentHash} from "../../operations/durableActions";
import {guestIdentity, requireDocumentId} from "./guestRecords";
import {smsEndpointId} from "./smsProtocol";
import {EVENT_ASSISTANCE_BUDGETS, EVENT_ASSISTANCE_PERMISSIONS} from
  "./messageConsentCollections";
export type {Permission};
export {smsEndpointId} from "./smsProtocol";

export const smsCollections = {
  senders: "eventAssistanceSmsSenders",
  permissions: EVENT_ASSISTANCE_PERMISSIONS,
  budgets: EVENT_ASSISTANCE_BUDGETS,
  dispatches: "eventAssistanceSmsDispatches",
} as const;

export function smsPermissionId(context: Permission["context"],
  attendeeId: string, senderId: string): string {
  requireDocumentId(senderId);
  return "sms-permission:" + operationContentHash([
    guestIdentity(context, attendeeId), senderId, "catchEventSms",
  ]);
}

export function parseSmsPermission(value: unknown): Permission {
  if (!validateEventAssistanceSmsPermissionDocument(value) ||
      value.permissionId !== smsPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      value.recipientEndpointId !== smsEndpointId(value.context,
        value.attendeeId, value.phoneE164) ||
      (value.recipientBinding && value.evidence !== null &&
        value.recipientBinding.subjectUid !== value.evidence.subjectUid) ||
      (value.evidence !== null &&
        (value.expiresAt <= value.evidence.acceptedAt ||
         value.updatedAt < Math.max(value.evidence.acceptedAt,
           value.evidence.phoneVerifiedAt)))) {
    throw new Error("Invalid event-service SMS permission");
  }
  return value;
}
