import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {DecideOrganizerCommunityMembershipCallablePayload} from
  "../shared/generated/decideOrganizerCommunityMembershipCallablePayload";
import type {DecideOrganizerCommunityMembershipCallableResponse} from
  "../shared/generated/decideOrganizerCommunityMembershipCallableResponse";
import type {OrganizerCommunityMembershipDocument} from
  "../shared/generated/organizerCommunityMembershipDocument";
import type {OrganizerCommunityMembershipDecisionDocument} from
  "../shared/generated/organizerCommunityMembershipDecisionDocument";
import {validateDecideOrganizerCommunityMembershipCallablePayload} from
  "../shared/generated/validators/decideOrganizerCommunityMembershipInput";
import {validateOrganizerCommunityMembershipDecisionDocument} from
  "../shared/generated/validators/organizerCommunityMembershipDecisionDocument";
import {
  communityMembershipId,
  communityMembershipDecisionId,
  readCommunityMembership,
} from "./communityMembershipAuthority";
import {readApprovedCommunityApplication} from
  "./communityApplicationAuthority";
import {applicationReviewRateLimit} from
  "../organizers/applicationReviewRateLimit";

interface Dependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  nowMillis: () => number;
}
const defaults: Dependencies = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  nowMillis: Date.now,
};

/**
 * Explicit entitlement decision; application review alone never grants
 * access.
 */
export async function decideOrganizerCommunityMembershipHandler(
  request: CallableRequest<unknown>,
  deps: Dependencies = defaults
): Promise<DecideOrganizerCommunityMembershipCallableResponse> {
  const actorUid = requireAuth(request);
  const payload =
    validateCallableWithAjv<DecideOrganizerCommunityMembershipCallablePayload>(
      request,
      validateDecideOrganizerCommunityMembershipCallablePayload
    );
  if (payload.reason.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A decision reason is required.");
  }
  const db = deps.firestore();
  // Deliberately share the manager application-review mutation budget.
  await deps.checkRateLimit(db, actorUid, "reviewOrganizerApplication",
    applicationReviewRateLimit);
  const nowMillis = deps.nowMillis();
  if (!Number.isSafeInteger(nowMillis) || nowMillis <= 0) {
    throw new HttpsError("internal", "Decision clock is unavailable.");
  }
  const {organizerId, uid, action, requestId, expectedRevision} = payload;
  const membershipId = communityMembershipId(organizerId, uid);
  const decisionId = communityMembershipDecisionId(organizerId, uid, requestId);
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify([
        actorUid,
        organizerId,
        uid,
        requestId,
        action,
        expectedRevision,
        payload.applicationId,
        payload.expectedApplicationRevision,
        payload.reason,
      ])
    )
    .digest("hex");
  return db.runTransaction(async (tx) => {
    await requireOrganizerManager({db, transaction: tx, organizerId, actorUid});
    const membershipRef = db
      .collection("organizerCommunityMemberships")
      .doc(membershipId);
    const decisionRef = db
      .collection("organizerCommunityMembershipDecisions")
      .doc(decisionId);
    const [decisionSnap, actorDeletion, subjectDeletion, current] =
      await Promise.all([
        tx.get(decisionRef),
        tx.get(db.collection("deletedUsers").doc(actorUid)),
        tx.get(db.collection("deletedUsers").doc(uid)),
        readCommunityMembership({db, tx, organizerId, uid, nowMillis}),
      ]);
    if (actorDeletion.exists) {
      throw new HttpsError("permission-denied", "Account is unavailable.");
    }
    if (decisionSnap.exists) {
      const decision = decisionSnap.data();
      if (
        !validateOrganizerCommunityMembershipDecisionDocument(decision) ||
        decision.requestHash !== requestHash ||
        decision.actorUid !== actorUid ||
        decision.membershipId !== membershipId ||
        decision.organizerId !== organizerId ||
        decision.uid !== uid ||
        decision.requestId !== requestId ||
        !current
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This request ID belongs to a different decision."
        );
      }
      return {
        membershipId,
        decisionId,
        decisionRevision: decision.resultingRevision,
        currentRevision: current.revision,
        currentState: current.state,
        replayed: true,
      };
    }
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new HttpsError(
        "failed-precondition",
        "Community membership changed. Refresh before deciding."
      );
    }
    if (action === "revoke" && current?.state !== "active") {
      throw new HttpsError(
        "failed-precondition",
        "There is no active membership to revoke."
      );
    }
    if (action === "grant" && subjectDeletion.exists) {
      throw new HttpsError("failed-precondition", "Account is unavailable.");
    }
    const source =
      action === "grant" ?
        await readApprovedCommunityApplication({
          db,
          tx,
          organizerId,
          uid,
          applicationId: payload.applicationId!,
          expectedApplicationRevision: payload.expectedApplicationRevision!,
          nowMillis,
        }) :
        current!.source;
    const resultingRevision = expectedRevision + 1;
    const decision: OrganizerCommunityMembershipDecisionDocument = {
      schemaVersion: 1,
      organizerId,
      uid,
      membershipId,
      requestId,
      requestHash,
      actorUid,
      action,
      reason: payload.reason,
      previousState: current?.state ?? "none",
      expectedRevision,
      resultingRevision,
      source,
      decidedAtMillis: nowMillis,
    };
    const membership: OrganizerCommunityMembershipDocument = {
      schemaVersion: 1,
      organizerId,
      uid,
      state: action === "grant" ? "active" : "revoked",
      revision: resultingRevision,
      source,
      lastDecisionId: decisionId,
      activatedAtMillis:
        action === "grant" ? nowMillis : current!.activatedAtMillis,
      updatedAtMillis: nowMillis,
    };
    tx.create(decisionRef, decision);
    tx.set(membershipRef, membership);
    return {
      membershipId,
      decisionId,
      decisionRevision: resultingRevision,
      currentRevision: resultingRevision,
      currentState: membership.state,
      replayed: false,
    };
  });
}

export const decideOrganizerCommunityMembership = onCall(
  appCheckCallableOptions,
  (request) => decideOrganizerCommunityMembershipHandler(request)
);
