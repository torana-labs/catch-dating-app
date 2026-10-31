/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned Host resolution for a checked-in late attendee stored at eventSuccessLateArrivals/{eventId_uid}.
 */
export interface EventSuccessLateArrivalDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  resolvedByUid: string;
  status: "insertedIntoOpenPair" | "extendedUnit" | "heldForNextRound";
  targetRoundIndex: number;
  assignmentDraftRevision: number;
  reason: string;
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
