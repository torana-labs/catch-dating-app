/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only receipt for one Instagram direct message the claim webhook handled, stored at organizerClaimInstagramMessages/{messageKey}. Meta retries deliveries, so the receipt makes each message count once. It keeps no message text or sender id. Firestore TTL deletes it after expiresAt.
 */
export interface OrganizerClaimInstagramMessageDocument {
  /**
   * SHA-256 of the Instagram message id.
   */
  messageKey: string;
  outcome:
    | "verified"
    | "wrongSender"
    | "expiredCode"
    | "codeAlreadyUsed"
    | "unknownCode"
    | "claimUnavailable"
    | "senderUnknown"
    | "rateLimited";
  attemptId: string | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  receivedAt: {
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
}
