/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One signed-in user's attempt to prove they run an organizer listing, stored at organizerClaimVerifications/{attemptId}. The requester reads their own attempt to show its code and to follow its status; a verified attempt records the evidence and the claim request it approved.
 */
export interface OrganizerClaimVerificationDocument {
  attemptId: string;
  organizerId: string;
  requesterUid: string;
  /**
   * instagramMessage: the organiser sends the code to Catch's Instagram account from the listing's handle. lumaDescription: the organiser puts the code in the listing's Luma calendar description.
   */
  method: "instagramMessage" | "lumaDescription";
  /**
   * awaitingProof until the proof arrives. An attempt still awaitingProof after expiresAt has expired; readers treat it so.
   */
  status: "awaitingProof" | "verified" | "expired" | "superseded";
  /**
   * The one-time code the requester shows the proof surface. Only the requester and the server can read it.
   */
  code: string;
  /**
   * Where the proof must come from: the listing's Instagram username without @, or its Luma calendar URL.
   */
  proofTarget: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  verifiedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  claimRequestId: string | null;
  /**
   * What proved the claim. Null until verified.
   */
  evidence: {
    source: "instagramMessage" | "lumaDescription";
    /**
     * The Instagram username Graph API returned for the sender, or the Luma calendar URL that showed the code.
     */
    observedIdentity: string;
    /**
     * SHA-256 of the Instagram message id. Null for Luma.
     */
    messageKey: string | null;
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    observedAt: {
      _seconds: number;
      _nanoseconds: number;
    };
  } | null;
  /**
   * The latest proof that arrived and did not verify, so the claim page can say what to fix.
   */
  lastRejection: {
    reason: "wrongSender" | "codeNotFound";
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    at: {
      _seconds: number;
      _nanoseconds: number;
    };
  } | null;
}
