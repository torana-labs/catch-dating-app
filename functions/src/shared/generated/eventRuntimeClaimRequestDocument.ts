/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Host-reviewable pending runtime identity claim stored at eventRuntimeClaimRequests/{eventId_uid}.
 */
export interface EventRuntimeClaimRequestDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  displayName: string;
  phoneLastFour: string;
  /**
   * @maxItems 20
   */
  candidateAttendeeIds: string[];
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy: string | null;
  reviewReason: string | null;
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
  reviewedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
}
