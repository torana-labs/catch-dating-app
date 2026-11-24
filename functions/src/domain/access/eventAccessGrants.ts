/**
 * Event access grants (issue #2474 step 2): one
 * accessGrants/event__{eventId}__{uid} document per event staff grant, the
 * document security rules get() to decide an event operator's reads.
 *
 * The grant commands stage it on the transaction that writes the
 * eventStaffGrants record, so a grant, a group duty or a revocation is in
 * force for rules the moment it commits. Event-wide permissions end at the
 * operator window eventOperatorExpiryMillis computes for the callables;
 * group duties keep their own instants and never extend it. Organiser
 * managers hold no event document: their authority comes from the organiser.
 */

import type {
  AccessGrantDocument,
  EventStaffGrantDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {
  eventOperatorExpiryMillis,
  staffTimestampMillis,
} from "../../shared/eventOperatorAuthority";
import {
  accessGrantId,
  accessGrantsCollection,
  type AccessGrantWriter,
} from "./programAccessGrants";

/** The event access document's id. */
export function eventAccessGrantId(eventId: string, uid: string): string {
  return accessGrantId("event", eventId, uid);
}

function raise(map: Record<string, number>, key: string, until: number):
  void {
  if ((map[key] ?? 0) < until) map[key] = until;
}

/**
 * The access document for one event staff grant, as the grant record reads
 * once its command commits. A revoked or malformed grant is an inactive
 * document with empty reach: no permission, no duty.
 * @param {EventStaffGrantDocument} grant The grant as the command writes it.
 * @param {FirebaseFirestore.Timestamp} updatedAt When the command commits.
 * @return {AccessGrantDocument} The document.
 */
export function eventAccessGrant(grant: EventStaffGrantDocument,
  updatedAt: FirebaseFirestore.Timestamp): AccessGrantDocument {
  const permissions: Record<string, number> = {};
  const groupDuties: Record<string, number> = {};
  let expiresAtMillis: number | null = null;
  let active = grant.status === "active" && grant.revokedAt == null &&
    grant.revokedBy == null;
  if (active) {
    try {
      expiresAtMillis = staffTimestampMillis(grant.expiresAt);
      const operatorUntil = eventOperatorExpiryMillis(grant);
      if (operatorUntil !== null && operatorUntil > 0) {
        for (const permission of grant.permissions ?? []) {
          raise(permissions, permission, operatorUntil);
        }
      }
      for (const duty of grant.groupDuties ?? []) {
        if (Number.isSafeInteger(duty.expiresAtMillis) &&
            duty.expiresAtMillis > 0) {
          raise(groupDuties, `${duty.groupId}__${duty.duty}`,
            Math.min(duty.expiresAtMillis, expiresAtMillis));
        }
      }
    } catch {
      active = false;
    }
  }
  if (!active) {
    expiresAtMillis = null;
    for (const key of Object.keys(permissions)) delete permissions[key];
    for (const key of Object.keys(groupDuties)) delete groupDuties[key];
  }
  return {
    scopeType: "event",
    scopeId: grant.eventId,
    uid: grant.uid,
    organizerId: grant.organizerId,
    role: "staff",
    status: active ? "active" : "inactive",
    activeFromMillis: 0,
    expiresAtMillis,
    reach: {permissions, groupDuties},
    assignments: [],
    grantedBy: grant.createdBy,
    revision: grant.revision,
    updatedAt,
    version: 1,
  };
}

/**
 * Stages the event access document for [grant] on the caller's transaction,
 * after every read, beside the grant record it mirrors.
 * @param {AccessGrantWriter} writer The caller's transaction or batch.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {EventStaffGrantDocument} grant The grant as the command writes it.
 * @param {FirebaseFirestore.Timestamp} updatedAt When the command commits.
 */
export function stageEventAccessGrant(writer: AccessGrantWriter,
  db: FirebaseFirestore.Firestore, grant: EventStaffGrantDocument,
  updatedAt: FirebaseFirestore.Timestamp): void {
  const ref = db.collection(accessGrantsCollection)
    .doc(eventAccessGrantId(grant.eventId, grant.uid));
  (writer as FirebaseFirestore.Transaction).set(ref,
    eventAccessGrant(grant, updatedAt));
}
