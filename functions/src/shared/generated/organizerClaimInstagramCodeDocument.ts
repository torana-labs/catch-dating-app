/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only reservation of a live Instagram claim code, stored at organizerClaimInstagramCodes/{code}. Keying by the code keeps live codes unique and lets the webhook find the attempt without a query. Firestore TTL deletes it after expiresAt.
 */
export interface OrganizerClaimInstagramCodeDocument {
  code: string;
  attemptId: string;
  organizerId: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Set when the code verified a claim or its attempt was superseded. A consumed code stays reserved until expiresAt, so a replay gets a clear answer.
   */
  consumedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
}
