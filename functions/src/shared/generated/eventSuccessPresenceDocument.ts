/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned liveness heartbeat stored at eventSuccessPresence/{eventId_uid}; presence state is derived from heartbeatAt and deployment policy rather than persisted.
 */
export interface EventSuccessPresenceDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  surface: "flutter" | "web";
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  heartbeatAt: {
    _seconds: number;
    _nanoseconds: number;
  };
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
}
