/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only, expiring capability that routes a verified forwarded roster to one event and Host identity.
 */
export interface EventRosterHandoffDocument {
  eventId: string;
  organizerId: string;
  hostUid: string;
  tokenHash: string;
  provider:
    | "generic"
    | "luma"
    | "eventbrite"
    | "partiful"
    | "posh"
    | "bookmyshow"
    | "district"
    | "sortmyscene"
    | "airbnb";
  status: "active" | "expired" | "revoked";
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
}
