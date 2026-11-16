import type {EventAssistanceSmsWithdrawalGrantDocument as WithdrawalGrant} from
  "../../shared/generated/eventAssistanceSmsWithdrawalGrantDocument";
import {validateEventAssistanceSmsWithdrawalGrantDocument} from
  "../../shared/generated/validators/eventAssistanceSmsWithdrawalGrantDocument";
import {operationContentHash} from "../../operations/durableActions";
import {Grant} from "./guestRecords";
import {Permission, smsPermissionId} from "./smsPermissionRecords";
import {EVENT_ASSISTANCE_WITHDRAWAL_GRANTS} from
  "./messageConsentCollections";

export type {WithdrawalGrant};
export const SMS_WITHDRAWAL_GRANTS = EVENT_ASSISTANCE_WITHDRAWAL_GRANTS;

export function parseSmsWithdrawalGrant(value: unknown): WithdrawalGrant {
  if (!validateEventAssistanceSmsWithdrawalGrantDocument(value) ||
      value.permissionId !== smsPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      value.expiresAt <= value.issuedAt) {
    throw new Error("Invalid SMS withdrawal authority");
  }
  return value;
}

/** Issued atomically with SMS dispatch, with no permission to enable texts. */
export function newSmsWithdrawalGrant(permission: Permission,
  grant: Grant, now: number): WithdrawalGrant {
  if (permission.status !== "granted" || grant.revokedAt !== null ||
      grant.expiresAt <= now || grant.issuedAt > now ||
      permission.updatedAt > now || permission.expiresAt <= now ||
      permission.attendeeId !== grant.attendeeId ||
      operationContentHash(permission.context) !==
        operationContentHash(grant.context)) {
    throw new Error("Cannot issue SMS withdrawal authority");
  }
  return parseSmsWithdrawalGrant({schemaVersion: 1,
    channel: "sms", linkId: grant.linkId,
    permissionId: permission.permissionId, context: permission.context,
    attendeeId: permission.attendeeId,
    attendeeGeneration: permission.attendeeGeneration,
    subjectUid: permission.evidence.subjectUid, senderId: permission.senderId,
    recipientEndpointId: permission.recipientEndpointId,
    guestGrantHash: operationContentHash(grant),
    permissionRevisionAtIssue: permission.revision,
    issuedAt: now, expiresAt: permission.expiresAt});
}

/** A link cannot act on a replacement attendee, subject or phone endpoint. */
export function smsWithdrawalMatchesPermission(grant: WithdrawalGrant,
  permission: Permission): boolean {
  return grant.permissionId === permission.permissionId &&
    grant.attendeeId === permission.attendeeId &&
    grant.attendeeGeneration === permission.attendeeGeneration &&
    grant.senderId === permission.senderId &&
    grant.subjectUid === permission.evidence?.subjectUid &&
    grant.recipientEndpointId === permission.recipientEndpointId &&
    grant.permissionRevisionAtIssue <= permission.revision &&
    operationContentHash(grant.context) ===
      operationContentHash(permission.context);
}
