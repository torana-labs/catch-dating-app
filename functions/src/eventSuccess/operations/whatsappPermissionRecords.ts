import type {EventWhatsappPermissionDocument as Permission} from
  "../../shared/generated/eventWhatsappPermissionDocument";
import {validateEventWhatsappPermissionDocument} from
  "../../shared/generated/validators/eventWhatsappPermissionDocument";
import {operationContentHash} from "../../operations/durableActions";
import {guestIdentity, requireDocumentId} from "./guestRecords";
import {whatsappEndpointId} from "./whatsappReplyProtocol";
import {EVENT_ASSISTANCE_PERMISSIONS} from
  "./messageConsentCollections";

export type {Permission};
export const WHATSAPP_PERMISSIONS = EVENT_ASSISTANCE_PERMISSIONS;

export function whatsappPermissionId(context: Permission["context"],
  attendeeId: string, senderId: string): string {
  requireDocumentId(senderId);
  return "wa-permission:" + operationContentHash([
    guestIdentity(context, attendeeId), senderId, "organizerEventWhatsapp",
  ]);
}

/** Consent binds the displayed identity independently of credentials. */
export function whatsappSenderHash(organizerId: string, senderId: string,
  sender: Permission["sender"]): string {
  return operationContentHash([organizerId, senderId, sender]);
}

export function parseWhatsappPermission(value: unknown): Permission {
  if (!validateEventWhatsappPermissionDocument(value) ||
      value.permissionId !== whatsappPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      value.recipientEndpointId !== whatsappEndpointId(value.phoneE164) ||
      (value.recipientBinding && value.evidence !== null &&
        value.recipientBinding.subjectUid !== value.evidence.subjectUid) ||
      (value.evidence !== null &&
        (value.evidence.senderHash !== whatsappSenderHash(
          value.context.organizerId, value.senderId, value.sender) ||
         value.expiresAt <= value.evidence.acceptedAt ||
         value.updatedAt < Math.max(value.evidence.acceptedAt,
           value.evidence.phoneVerifiedAt)))) {
    throw new Error("Invalid event-service WhatsApp permission");
  }
  return value;
}
