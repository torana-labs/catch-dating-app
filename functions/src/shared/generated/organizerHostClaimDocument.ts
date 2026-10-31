/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned singleton claim stored at organizerHostClaims/{uid} to enforce one hosted club per user.
 */
export interface OrganizerHostClaimDocument {
  uid: string;
  organizerId: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
