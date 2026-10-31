/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Catch-private safety review item materialized from event feedback concerns.
 */
export interface EventSafetyReportDocument {
  eventId: string;
  organizerId: string;
  reporterUserId: string;
  feedbackId: string;
  source: "event_success_feedback";
  status: "open" | "reviewed" | "dismissed";
  note?: string;
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
