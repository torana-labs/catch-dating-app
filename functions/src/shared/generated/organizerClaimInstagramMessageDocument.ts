/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only receipt for one Instagram direct message the webhook handled, stored at organizerClaimInstagramMessages/{messageKey}: a claim code, or a nominator's message that Catch answered. Meta retries deliveries, so the receipt makes each message count once and each reply go once. It keeps no message text or sender id; a nomination keeps the nominator's registry id. Firestore TTL deletes it after expiresAt.
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
    | "rateLimited"
    | "nominationQueued"
    | "nominationWithoutLinks"
    | "nominationRateLimited"
    | "nominationUnclear"
    | "shareWithoutProfile";
  attemptId: string | null;
  /**
   * The registered nominator who sent a nomination, so auto-publish can check they still are one. Null for claim messages.
   */
  nominatorId: string | null;
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
