import type {EventWhatsappWithdrawalGrantDocument as WithdrawalGrant} from
  "../../shared/generated/eventWhatsappWithdrawalGrantDocument";
import {validateEventWhatsappWithdrawalGrantDocument} from
  "../../shared/generated/validators/eventWhatsappWithdrawalGrantDocument";
import {operationContentHash} from "../../operations/durableActions";
import {Grant} from "./guestRecords";
import {Permission, whatsappPermissionId} from "./whatsappPermissionRecords";
import {EVENT_ASSISTANCE_WITHDRAWAL_GRANTS} from "./messageConsentCollections";

export type {WithdrawalGrant};
export const WHATSAPP_WITHDRAWAL_GRANTS = EVENT_ASSISTANCE_WITHDRAWAL_GRANTS;

export function parseWhatsappWithdrawalGrant(value: unknown): WithdrawalGrant {
  if (!validateEventWhatsappWithdrawalGrantDocument(value) ||
      value.permissionId !== whatsappPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      value.expiresAt <= value.issuedAt) {
    throw new Error("Invalid WhatsApp withdrawal authority");
  }
  return value;
}

/** Issued with dispatch; no authority to enable messages. */
export function newWhatsappWithdrawalGrant(permission: Permission,
  grant: Grant, now: number): WithdrawalGrant {
  if (permission.status !== "granted" || grant.revokedAt !== null ||
      grant.expiresAt <= now || grant.issuedAt > now ||
      permission.updatedAt > now || permission.expiresAt <= now ||
      permission.attendeeId !== grant.attendeeId ||
      operationContentHash(permission.context) !==
        operationContentHash(grant.context)) {
    throw new Error("Cannot issue WhatsApp withdrawal authority");
  }
  return parseWhatsappWithdrawalGrant({schemaVersion: 1, channel: "whatsapp", linkId: grant.linkId,
    permissionId: permission.permissionId, context: permission.context,
    attendeeId: permission.attendeeId,
    attendeeGeneration: permission.attendeeGeneration,
    subjectUid: permission.evidence.subjectUid, senderId: permission.senderId,
    recipientEndpointId: permission.recipientEndpointId,
    guestGrantHash: operationContentHash(grant),
    permissionRevisionAtIssue: permission.revision,
    providerAccountId: permission.sender.providerAccountId,
    providerPhoneNumberId: permission.sender.providerPhoneNumberId,
    issuedAt: now, expiresAt: permission.expiresAt});
}

/** A link cannot act on a replacement attendee, subject or phone endpoint. */
export function whatsappWithdrawalMatchesPermission(grant: WithdrawalGrant,
  permission: Permission): boolean {
  return grant.permissionId === permission.permissionId &&
    grant.attendeeId === permission.attendeeId &&
    grant.attendeeGeneration === permission.attendeeGeneration &&
    grant.senderId === permission.senderId &&
    grant.providerAccountId === permission.sender.providerAccountId &&
    grant.providerPhoneNumberId === permission.sender.providerPhoneNumberId &&
    grant.subjectUid === permission.evidence?.subjectUid &&
    grant.recipientEndpointId === permission.recipientEndpointId &&
    grant.permissionRevisionAtIssue <= permission.revision &&
    operationContentHash(grant.context) ===
      operationContentHash(permission.context);
}
