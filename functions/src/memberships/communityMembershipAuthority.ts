import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {
  requiresCommunityMembership,
  type EventPolicyBundleDocument,
} from "../events/eventPolicy";
import type {OrganizerCommunityMembershipDocument} from
  "../shared/generated/organizerCommunityMembershipDocument";
import {validateOrganizerCommunityMembershipDocument} from
  "../shared/generated/validators/organizerCommunityMembershipDocument";
import {validateOrganizerCommunityMembershipDecisionDocument} from
  "../shared/generated/validators/organizerCommunityMembershipDecisionDocument";

export function communityMembershipId(
  organizerId: string,
  uid: string
): string {
  return (
    "ocm_" +
    createHash("sha256")
      .update(JSON.stringify([organizerId, uid]))
      .digest("hex")
  );
}

export function communityMembershipDecisionId(
  organizerId: string,
  uid: string,
  requestId: string
): string {
  return (
    "ocmd_" +
    createHash("sha256")
      .update(JSON.stringify([organizerId, uid, requestId]))
      .digest("hex")
  );
}

/**
 * Read the current entitlement and its immutable decision in one
 * transaction.
 */
export async function readCommunityMembership(params: {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  organizerId: string;
  uid: string;
  nowMillis?: number;
}): Promise<OrganizerCommunityMembershipDocument | null> {
  const {db, tx, organizerId, uid} = params;
  const read = (collection: string, id: string) =>
    tx ?
      tx.get(db.collection(collection).doc(id)) :
      db.collection(collection).doc(id).get();
  const id = communityMembershipId(organizerId, uid);
  const raw = (await read("organizerCommunityMemberships", id)).data();
  if (raw === undefined) return null;
  const fail = (): never => {
    throw new HttpsError(
      "failed-precondition",
      "Community membership authority is unavailable."
    );
  };
  if (
    !validateOrganizerCommunityMembershipDocument(raw) ||
    raw.organizerId !== organizerId ||
    raw.uid !== uid ||
    raw.updatedAtMillis < raw.activatedAtMillis ||
    raw.updatedAtMillis > (params.nowMillis ?? Date.now())
  ) {
    return fail();
  }
  const decision = (
    await read("organizerCommunityMembershipDecisions", raw.lastDecisionId)
  ).data();
  if (
    !validateOrganizerCommunityMembershipDecisionDocument(decision) ||
    decision.organizerId !== organizerId ||
    decision.uid !== uid ||
    decision.membershipId !== id ||
    communityMembershipDecisionId(organizerId, uid, decision.requestId) !==
      raw.lastDecisionId ||
    decision.resultingRevision !== raw.revision ||
    decision.expectedRevision + 1 !== decision.resultingRevision ||
    (decision.expectedRevision === 0) !== (decision.previousState === "none") ||
    (decision.action === "revoke" && decision.previousState !== "active") ||
    decision.decidedAtMillis !== raw.updatedAtMillis ||
    (decision.action === "grant" ? "active" : "revoked") !== raw.state ||
    decision.source.applicationId !== raw.source.applicationId ||
    decision.source.responseId !== raw.source.responseId ||
    decision.source.formVersionId !== raw.source.formVersionId ||
    decision.source.applicationRevision !== raw.source.applicationRevision
  ) {
    return fail();
  }
  return raw;
}

/**
 * No follow/contact/legacy fallback; ungated events do not incur these
 * reads.
 */
export async function hasEventCommunityMembership(params: {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  organizerId: string;
  uid: string;
  policy: Pick<EventPolicyBundleDocument, "admission">;
  nowMillis?: number;
}): Promise<boolean> {
  if (!requiresCommunityMembership(params.policy) &&
      params.policy.admission.approvedMembersSkipReview !== true) return true;
  return (await readCommunityMembership(params))?.state === "active";
}
