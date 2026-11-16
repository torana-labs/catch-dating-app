import type {EventRcsPermissionDocument as Permission} from
  "../../shared/generated/eventRcsPermissionDocument";
import type {EventRcsConsentReceiptDocument as ConsentReceipt} from
  "../../shared/generated/eventRcsConsentReceiptDocument";
import {validateEventRcsPermissionDocument} from
  "../../shared/generated/validators/eventRcsPermissionDocument";
import {validateEventRcsConsentReceiptDocument} from
  "../../shared/generated/validators/eventRcsConsentReceiptDocument";
import {operationContentHash} from "../../operations/durableActions";
import {guestIdentity, requireDocumentId} from "./guestRecords";
import {rcsEndpointId, rcsPhoneHash} from "./rcsProtocol";
import {RcsSubscription, rcsSubscriptionId} from "./rcsSubscriptions";
import {EVENT_ASSISTANCE_CONSENT_RECEIPTS, EVENT_ASSISTANCE_PERMISSIONS} from
  "./messageConsentCollections";

export type {Permission, ConsentReceipt};
export const rcsConsentCollections = {
  senders: "eventAssistanceRcsSenders",
  permissions: EVENT_ASSISTANCE_PERMISSIONS,
  receipts: EVENT_ASSISTANCE_CONSENT_RECEIPTS,
} as const;
export const RCS_CONSENT_VERSION = "catch-event-service-rcs-v1";
export const RCS_CONSENT_TEXT =
  "Receive RCS messages from the Catch sender shown here about joining, " +
  "changes and follow-up for this event, until 24 hours after it ends. " +
  "I can turn them off here or reply STOP in the conversation.";
export const RCS_CONSENT_HASH = operationContentHash([
  RCS_CONSENT_VERSION, RCS_CONSENT_TEXT,
]);

export function rcsPermissionId(context: Permission["context"],
  attendeeId: string, senderId: string) {
  requireDocumentId(senderId);
  return "rcs-permission:" + operationContentHash([
    guestIdentity(context, attendeeId), senderId, "catchEventRcs",
  ]);
}

export function rcsSenderHash(senderId: string,
  sender: Permission["sender"]): string {
  return operationContentHash([senderId, sender]);
}

/** START and unrelated observation revisions cannot change a stop review. */
export function rcsStopHash(subscription: RcsSubscription | null):
  string | null {
  return subscription?.lastStop ? operationContentHash([
    subscription.agentId, subscription.endpointHash, subscription.lastStop,
  ]) : null;
}

export function parseRcsPermission(value: unknown): Permission {
  if (!validateEventRcsPermissionDocument(value) ||
      value.permissionId !== rcsPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      (value.recipientBinding &&
        (value.recipientBinding.subjectUid !== value.subjectUid ||
         value.recipientBinding.sourceGeneration !== value.sourceGeneration)) ||
      value.recipientEndpointId !== rcsEndpointId(value.context,
        value.attendeeId, value.phoneE164) ||
      !value.sender.displayName.trim() ||
      Buffer.from(value.sender.displayName, "utf8").toString("utf8") !==
        value.sender.displayName ||
      (value.evidence !== null &&
        (value.evidence.senderHash !== rcsSenderHash(value.senderId,
          value.sender) || value.expiresAt <= value.evidence.acceptedAt ||
          value.updatedAt < Math.max(value.evidence.acceptedAt,
            value.evidence.phoneVerifiedAt)))) {
    throw new Error("Invalid event-service RCS permission");
  }
  if (value.subscriptionId !== rcsSubscriptionId(value.sender.agentId,
    rcsPhoneHash(value.phoneE164)!)) {
    throw new Error("Invalid RCS permission conversation");
  }
  return value;
}

export function parseRcsConsentReceipt(value: unknown): ConsentReceipt {
  if (!validateEventRcsConsentReceiptDocument(value) ||
      (value.decision === "grant" &&
        (value.copyVersion !== RCS_CONSENT_VERSION ||
          value.copyHash !== RCS_CONSENT_HASH))) {
    throw new Error("Invalid event-service RCS consent receipt");
  }
  return value;
}

/** Every mutable grant field is covered by the exact immutable receipt. */
export function rcsPermissionHasReceipt(permission: Permission,
  receipt: ConsentReceipt | null): boolean {
  return permission.status === "granted" && receipt?.decision === "grant" &&
    receipt.copyVersion === RCS_CONSENT_VERSION &&
    receipt.copyHash === RCS_CONSENT_HASH &&
    permission.currentReceiptId === receipt.receiptId &&
    permission.evidence.receiptId === receipt.receiptId &&
    permission.subjectUid === receipt.actorUid &&
    permission.evidence.acceptedAt === receipt.createdAt &&
    permission.evidence.phoneVerifiedAt === receipt.createdAt &&
    permission.evidence.reviewHash === receipt.reviewHash &&
    permission.evidence.reviewedStopHash === receipt.reviewedStopHash &&
    permission.evidence.senderHash === receipt.senderHash &&
    receipt.senderHash === rcsSenderHash(permission.senderId,
      permission.sender) &&
    permission.revision === receipt.appliedRevision &&
    permission.attendeeId === receipt.attendeeId &&
    permission.attendeeGeneration === receipt.attendeeGeneration &&
    permission.sourceGeneration === receipt.sourceGeneration &&
    permission.senderId === receipt.senderId &&
    permission.recipientEndpointId === receipt.recipientEndpointId &&
    operationContentHash(permission.context) ===
      operationContentHash(receipt.context) &&
    operationContentHash(permission) === receipt.permissionHash;
}

/** Permission prerequisite only; never a sender, spending or dispatch grant. */
export function rcsPermissionClearsStop(permission: Permission,
  subscription: RcsSubscription | null): boolean {
  return permission.status === "granted" &&
    (!subscription || (subscription.agentId === permission.sender.agentId &&
      subscription.endpointHash === rcsPhoneHash(permission.phoneE164))) &&
    permission.evidence.reviewedStopHash === rcsStopHash(subscription) &&
    (!subscription?.lastStop ||
      permission.evidence.acceptedAt > subscription.lastStop.observedAt);
}
