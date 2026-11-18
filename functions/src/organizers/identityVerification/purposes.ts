/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerClaimRequestDocument,
  OrganizerClaimVerificationDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../../shared/validation";
import {
  assertCanBeClaimed,
  organizerClaimRequestId,
  prepareOrganizerClaimApproval,
} from "../organizerClaimApproval";
import type {VerificationMethodId} from "./methods";

// What a verified proof unlocks (issue #2096). The method proves control of
// a channel; the purpose decides what that proof is for. Today the only
// purpose is claiming a listing; standing for a takedown request and
// verifying an imported page are added here, through the same attempts.

export type VerificationPurposeId = "claim";

/** The evidence a method observed. */
export interface VerifiedProof {
  source: VerificationMethodId;
  observedIdentity: string;
  messageKey: string | null;
  decisionReason: string;
  proofUrl: string;
}

export interface VerifiedOutcome {
  /** The claim request the proof approved, when the purpose is a claim. */
  claimRequestId: string | null;
}

export interface PurposeContext {
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  transitionId: string;
  recordedAt: string;
}

export interface VerificationPurpose {
  id: VerificationPurposeId;
  /** Throws a typed refusal when this organizer cannot be verified for this purpose. */
  assertEligible: (organizer: OrganizerDocument, uid: string) => void;
  /**
   * Stages what the proof unlocks, after the caller's own reads. Returns
   * null, writing nothing, when the purpose can no longer be met this way.
   */
  stageVerified: (tx: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore, attempt: OrganizerClaimVerificationDocument,
    proof: VerifiedProof, context: PurposeContext) => Promise<VerifiedOutcome | null>;
}

/** Claiming a listing: the proof approves the claim through the one ownership writer. */
const claim: VerificationPurpose = {
  id: "claim",
  assertEligible: (organizer) => assertCanBeClaimed(organizer),
  stageVerified: async (tx, db, attempt, proof, context) => {
    const organizerSnap = await tx.get(
      db.collection("organizers").doc(attempt.organizerId));
    const requestId = organizerClaimRequestId(attempt.organizerId,
      attempt.requesterUid);
    const requestSnap = await tx.get(
      db.collection("organizerClaimRequests").doc(requestId));
    const pendingRequest = requestSnap.exists &&
      requireDoc<OrganizerClaimRequestDocument>(requestSnap,
        "OrganizerClaimRequestDocument").status === "pending";
    let stageApproval: () => void;
    try {
      if (!organizerSnap.exists) {
        throw new HttpsError("not-found", "Organizer listing not found.");
      }
      stageApproval = await prepareOrganizerClaimApproval(tx, db, {
        requestId,
        organizerId: attempt.organizerId,
        requesterUid: attempt.requesterUid,
        organizer: requireDoc<OrganizerDocument>(organizerSnap,
          "OrganizerDocument"),
        decidedByUid: null,
        decisionReason: proof.decisionReason,
        notificationActorUid: attempt.requesterUid,
        // A request the requester already sent to staff review is approved
        // as it stands; otherwise the verified claim creates its own.
        newRequest: pendingRequest ? null :
          {requesterRole: "owner", proofUrls: [proof.proofUrl]},
        supersedeOtherPendingClaim: true,
        transitionId: context.transitionId,
        recordedAt: context.recordedAt,
        serverTimestamp: context.serverTimestamp,
      });
    } catch (error) {
      if (error instanceof HttpsError) return null;
      throw error;
    }
    stageApproval();
    return {claimRequestId: requestId};
  },
};

const PURPOSES: Record<VerificationPurposeId, VerificationPurpose> = {claim};

/** The purpose an attempt serves; an attempt saved before purposes existed is a claim. */
export function verificationPurpose(id: string | null | undefined): VerificationPurpose {
  const purpose = PURPOSES[(id ?? "claim") as VerificationPurposeId];
  if (!purpose) throw new Error(`Unknown verification purpose: ${id}`);
  return purpose;
}
