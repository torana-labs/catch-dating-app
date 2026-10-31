/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Attendee-private end-of-event conversation edges stored at eventSuccessConversationGraphs/{eventId_uid}. Hosts consume aggregate scorecard counts only.
 */
export interface EventSuccessConversationGraphDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  status: "submitted" | "skipped";
  /**
   * @maxItems 1000
   */
  selectedUids: string[];
  assignedSelectedCount: number;
  assignedCandidateCount: number;
  /**
   * Snapshot of the event plan mode shown for this response.
   */
  consentMode: "optIn" | "optOut";
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
