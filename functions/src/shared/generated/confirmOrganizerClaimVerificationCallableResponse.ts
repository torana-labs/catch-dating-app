/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable response returned by confirmOrganizerClaimVerification after it reads the listing's Luma calendar for the attempt's code.
 */
export interface ConfirmOrganizerClaimVerificationCallableResponse {
  attemptId: string;
  /**
   * claimUnavailable: the page was claimed or closed meanwhile, so staff review is the way forward.
   */
  status: "awaitingProof" | "verified" | "expired" | "claimUnavailable";
  claimRequestId: string | null;
  lastRejection: ("codeNotFound" | "pageUnavailable") | null;
}
