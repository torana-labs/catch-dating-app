/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable response returned by startOrganizerClaimVerification: the live attempt and the code to show. Starting again while an attempt has more than five minutes left returns that attempt.
 */
export interface StartOrganizerClaimVerificationCallableResponse {
  attemptId: string;
  organizerId: string;
  method: "instagramMessage" | "lumaDescription";
  code: string;
  /**
   * Exactly what the organiser sends or pastes: the code for Instagram, catch-<code> for Luma.
   */
  proofText: string;
  proofTarget: string;
  /**
   * Catch's Instagram username without @, for instagramMessage attempts.
   */
  catchInstagramHandle: string | null;
  expiresAt: string;
}
