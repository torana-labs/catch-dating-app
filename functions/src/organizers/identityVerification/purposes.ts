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
import {verificationMethod, type VerificationMethod, type VerificationMethodId} from "./methods";

// What a verified proof unlocks (issue #2096). The method proves control of
// a channel; the purpose decides what that proof is for: claiming a listing,
// or proving an identity imported from a third party's public page so the
// owner can publish it. Standing for a takedown request is added here next,
// through the same attempts.

export type VerificationPurposeId = "claim" | "importVerification";

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
  /** Where this method's proof must come from for this purpose, or null. */
  proofTarget: (method: VerificationMethod, organizer: OrganizerDocument) => string | null;
  /** Words for the refusal when the account is not ready to verify. */
  accountNotReadyMessage: string;
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
  proofTarget: (method, organizer) => method.proofTarget(organizer),
  accountNotReadyMessage: "Finish your Catch account before you claim a page.",
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

/** The organizer's imported identities, as the sources a method reads its target from. */
function importedIdentities(organizer: OrganizerDocument): OrganizerDocument {
  const identities = organizer.importProvenance?.identities ?? [];
  return {instagramHandle: null, publicSources: identities.map((identity) => ({type: identity.platform,
    href: identity.url}))} as unknown as OrganizerDocument;
}

function awaitingImportVerification(organizer: OrganizerDocument, uid: string): boolean {
  return organizer.ownerUserId === uid && organizer.importProvenance?.verification === "unverified";
}

/**
 * Proving an imported identity (owner decision, 18 Nov 2026). A try-it
 * workspace filled from a third party's public page stays unpublished until
 * its owner proves control of an identity that page named. The target comes
 * only from importProvenance, which the server wrote at import, never from
 * fields the owner can edit, and success marks the provenance verified; the
 * workspace's ownership is unchanged (its owner already owns it).
 */
const importVerification: VerificationPurpose = {
  id: "importVerification",
  assertEligible: (organizer, uid) => {
    if (!awaitingImportVerification(organizer, uid)) {
      throw new HttpsError("failed-precondition",
        "This page has no imported identity waiting to be verified.",
        {reason: "import_verification_not_needed"});
    }
  },
  proofTarget: (method, organizer) =>
    method.proofTarget(importedIdentities(organizer)),
  accountNotReadyMessage: "Finish your Catch account before you verify this page.",
  stageVerified: async (tx, db, attempt) => {
    const organizerRef = db.collection("organizers").doc(attempt.organizerId);
    const organizerSnap = await tx.get(organizerRef);
    if (!organizerSnap.exists) return null;
    const organizer = requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument");
    if (!awaitingImportVerification(organizer, attempt.requesterUid)) return null;
    // A later import replaced the identities this attempt was started for.
    if (importVerification.proofTarget(verificationMethod(attempt.method), organizer) !== attempt.proofTarget) return null;
    tx.update(organizerRef, {"importProvenance.verification": "verified"});
    return {claimRequestId: null};
  },
};

const PURPOSES: Record<VerificationPurposeId, VerificationPurpose> = {claim, importVerification};

/** The purpose an attempt serves; an attempt saved before purposes existed is a claim. */
export function verificationPurpose(id: string | null | undefined): VerificationPurpose {
  const purpose = PURPOSES[(id ?? "claim") as VerificationPurposeId];
  if (!purpose) throw new Error(`Unknown verification purpose: ${id}`);
  return purpose;
}
