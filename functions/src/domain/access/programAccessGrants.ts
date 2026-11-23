/**
 * Programme access grants (issue #2474, STR-2 + FIX-10): one
 * accessGrants/program__{programId}__{uid} document per programme and person,
 * the document security rules get() to decide programme reads.
 *
 * The caller computes the person's authority with programAccessViewFor, the
 * same function that builds programAccessViews, and stages the write here on
 * its own transaction or batch. A grant, owner or revocation is therefore in
 * force the moment its command commits; no trigger stands between a command
 * and the rules. This module owns the document's shape and id, never the
 * decision of who holds what.
 */

import type {
  AccessGrantDocument,
  ProgramAccessViewDocument,
} from "../../shared/generated/firestoreAdminTypes";

export const accessGrantsCollection = "accessGrants";

export type AccessScopeType = AccessGrantDocument["scopeType"];

/**
 * The deterministic id security rules build from what they already trust:
 * scopeType__scopeId__uid. Auth uids hold no underscore, so the id is
 * unambiguous even when a scope id contains one.
 * @param {AccessScopeType} scopeType The kind of scope.
 * @param {string} scopeId The scope's document id.
 * @param {string} uid The account.
 * @return {string} The document id.
 */
export function accessGrantId(scopeType: AccessScopeType, scopeId: string,
  uid: string): string {
  return `${scopeType}__${scopeId}__${uid}`;
}

/** The programme access document's id. */
export function programAccessGrantId(programId: string, uid: string): string {
  return accessGrantId("program", programId, uid);
}

/**
 * The access document for one programme and person, from the authority
 * programAccessViewFor computed with no organizer manager standing (setup
 * access comes from the organizer in rules, never from this document). Null
 * when the person holds nothing on the programme: no document, no access.
 * @param {ProgramAccessViewDocument|null} view The person's authority.
 * @param {string|null} grantedBy Who approved the grant; null for the owner.
 * @param {FirebaseFirestore.Timestamp} updatedAt When the command commits.
 * @return {AccessGrantDocument|null} The document, or null.
 */
export function programAccessGrant(view: ProgramAccessViewDocument | null,
  grantedBy: string | null,
  updatedAt: FirebaseFirestore.Timestamp): AccessGrantDocument | null {
  if (!view) return null;
  const owner = view.role === "manager";
  return {
    scopeType: "program",
    scopeId: view.programId,
    uid: view.uid,
    organizerId: view.organizerId,
    role: owner ? "owner" : "staff",
    status: view.status,
    activeFromMillis: view.activeFromMillis,
    expiresAtMillis: view.expiresAtMillis,
    reach: {
      duties: view.duties,
      pickupAll: view.pickupAll,
      pickupScoped: view.pickupScoped,
      hotelAll: view.hotelAll,
      hotelScoped: view.hotelScoped,
      functionAll: view.functionAll,
      functionScoped: view.functionScoped,
      programAll: view.programAll,
      workPickup: view.workPickup,
      workHotel: view.workHotel,
      workFunction: view.workFunction,
      arrivalRoutes: view.arrivalRoutes,
      tripRoutes: view.tripRoutes,
    },
    assignments: view.assignments,
    grantedBy: owner ? null : grantedBy,
    revision: view.revision,
    updatedAt,
    version: 1,
  };
}

/** A transaction or batch the caller already holds. */
export type AccessGrantWriter = Pick<FirebaseFirestore.Transaction,
  "set" | "delete"> | Pick<FirebaseFirestore.WriteBatch, "set" | "delete">;

/**
 * Stages one programme access document on the caller's transaction or
 * batch: set when the person holds something, deleted otherwise. Call it
 * after every read of the transaction.
 * @param {AccessGrantWriter} writer The caller's transaction or batch.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params The programme, person and authority.
 * @param {string} params.programId The programme document id.
 * @param {string} params.uid The account.
 * @param {ProgramAccessViewDocument|null} params.view The person's
 *   authority, from programAccessViewFor with no organizer manager standing.
 * @param {string|null} params.grantedBy Who approved the grant.
 * @param {FirebaseFirestore.Timestamp} params.updatedAt When it commits.
 */
export function stageProgramAccessGrant(writer: AccessGrantWriter,
  db: FirebaseFirestore.Firestore, params: {
    programId: string;
    uid: string;
    view: ProgramAccessViewDocument | null;
    grantedBy: string | null;
    updatedAt: FirebaseFirestore.Timestamp;
  }): void {
  const ref = db.collection(accessGrantsCollection)
    .doc(programAccessGrantId(params.programId, params.uid));
  const document = programAccessGrant(params.view, params.grantedBy,
    params.updatedAt);
  if (document) {
    (writer as FirebaseFirestore.Transaction).set(ref, document);
  } else {
    (writer as FirebaseFirestore.Transaction).delete(ref);
  }
}
