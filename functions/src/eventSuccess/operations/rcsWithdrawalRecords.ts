import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {EventRcsWithdrawalGrantDocument as WithdrawalGrant} from
  "../../shared/generated/eventRcsWithdrawalGrantDocument";
import {validateEventRcsWithdrawalGrantDocument} from
  "../../shared/generated/validators/eventRcsWithdrawalGrantDocument";
import {operationContentHash} from "../../operations/durableActions";
import {Grant, guestCollections, parseGrant} from "./guestRecords";
import {Permission, parseRcsPermission, rcsPermissionId, rcsConsentCollections,
  parseRcsConsentReceipt, rcsPermissionHasReceipt} from "./rcsConsent";
import {rcsSubscriptionId} from "./rcsSubscriptions";
import {EVENT_ASSISTANCE_WITHDRAWAL_GRANTS, withdrawalGrantId} from
  "./messageConsentCollections";

export type {WithdrawalGrant};
export const RCS_WITHDRAWAL_GRANTS = EVENT_ASSISTANCE_WITHDRAWAL_GRANTS;

export function parseRcsWithdrawalGrant(value: unknown): WithdrawalGrant {
  if (!validateEventRcsWithdrawalGrantDocument(value) ||
      value.permissionId !== rcsPermissionId(value.context,
        value.attendeeId, value.senderId) ||
      value.expiresAt <= value.issuedAt) {
    throw new Error("Invalid RCS withdrawal authority");
  }
  // Reuse the exact provider-agent encoding check without storing a phone.
  rcsSubscriptionId(value.agentId, "0".repeat(64));
  return value;
}

/** The lifetime is independent of the joining instructions, never consent. */
export function newRcsWithdrawalGrant(permission: Permission,
  grant: Grant, now: number): WithdrawalGrant {
  parseRcsPermission(permission);
  parseGrant(grant);
  if (!Number.isSafeInteger(now) || now < 0 ||
      permission.status !== "granted" || grant.revokedAt !== null ||
      grant.expiresAt <= now || grant.issuedAt > now ||
      permission.updatedAt > now || permission.expiresAt <= now ||
      permission.attendeeId !== grant.attendeeId ||
      operationContentHash(permission.context) !==
        operationContentHash(grant.context)) {
    throw new Error("Cannot issue RCS withdrawal authority");
  }
  return parseRcsWithdrawalGrant({schemaVersion: 1,
    channel: "rcs", linkId: grant.linkId,
    permissionId: permission.permissionId, context: permission.context,
    attendeeId: permission.attendeeId,
    attendeeGeneration: permission.attendeeGeneration,
    sourceGeneration: permission.sourceGeneration,
    subjectUid: permission.subjectUid, senderId: permission.senderId,
    agentId: permission.sender.agentId,
    recipientEndpointId: permission.recipientEndpointId,
    guestGrantHash: operationContentHash(grant),
    permissionRevisionAtIssue: permission.revision,
    issuedAt: now, expiresAt: permission.expiresAt});
}

/** Old links cannot act on replacement sources, subjects, phones or agents. */
export function rcsWithdrawalMatchesPermission(grant: WithdrawalGrant,
  permission: Permission): boolean {
  return grant.permissionId === permission.permissionId &&
    grant.attendeeId === permission.attendeeId &&
    grant.attendeeGeneration === permission.attendeeGeneration &&
    grant.sourceGeneration === permission.sourceGeneration &&
    grant.senderId === permission.senderId &&
    grant.agentId === permission.sender.agentId &&
    grant.subjectUid === permission.subjectUid &&
    grant.recipientEndpointId === permission.recipientEndpointId &&
    grant.permissionRevisionAtIssue <= permission.revision &&
    operationContentHash(grant.context) ===
      operationContentHash(permission.context);
}

/** Stages immutable issuance in the caller's transaction; not a send permit.
 * The future dispatch owner must also check sources, STOP, sender and budget.
 * Call commit only after every dispatch read has completed.
 */
export async function prepareRcsWithdrawal(db: Firestore, tx: Transaction,
  permission: Permission, grant: Grant, now: number) {
  const candidate = newRcsWithdrawalGrant(permission, grant, now);
  const ref = db.collection(RCS_WITHDRAWAL_GRANTS)
    .doc(withdrawalGrantId("rcs", grant.linkId));
  const [existing, storedPermission, storedGuest, storedReceipt] =
    await tx.getAll(ref,
      db.collection(rcsConsentCollections.permissions)
        .doc(permission.permissionId),
      db.collection(guestCollections.grants).doc(grant.linkId),
      db.collection(rcsConsentCollections.receipts)
        .doc(permission.currentReceiptId));
  if (!storedPermission.exists || !storedGuest.exists ||
      !storedReceipt.exists ||
      operationContentHash(parseRcsPermission(storedPermission.data())) !==
        operationContentHash(permission) ||
      operationContentHash(parseGrant(storedGuest.data())) !==
        candidate.guestGrantHash ||
      !rcsPermissionHasReceipt(permission,
        parseRcsConsentReceipt(storedReceipt.data()))) {
    throw new Error("RCS withdrawal preparation is stale");
  }
  const authority = existing.exists ?
    parseRcsWithdrawalGrant(existing.data()) : candidate;
  if (authority.linkId !== grant.linkId ||
      authority.guestGrantHash !== candidate.guestGrantHash ||
      !rcsWithdrawalMatchesPermission(authority, permission) ||
      authority.issuedAt > now || authority.expiresAt <= now ||
      authority.expiresAt < permission.expiresAt) {
    // A longer new consent window needs a new message link, not an extension
    // of a bearer credential which has already been distributed.
    throw new Error("RCS withdrawal binding requires a new link");
  }
  return {authority, commit: () => {
    if (!existing.exists) tx.create(ref, authority);
  }};
}
