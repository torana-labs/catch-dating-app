/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Host-private access material for invite-only events stored at eventPrivateAccess/{eventId}.
 */
export interface EventPrivateAccessDocument {
  eventId: string;
  organizerId: string;
  inviteCode: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
