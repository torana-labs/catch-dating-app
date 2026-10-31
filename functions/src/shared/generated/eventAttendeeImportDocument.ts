/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Idempotency and audit receipt for one Host operational-roster import.
 */
export interface EventAttendeeImportDocument {
  eventId: string;
  organizerId: string;
  uploadedBy: string;
  importKey: string;
  fileName: string;
  format: "csv" | "xlsx" | "manual";
  payloadHash: string;
  status: "completed" | "partial" | "failed";
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  /**
   * @maxItems 100
   */
  errors: {
    rowId: string;
    code: string;
    message: string;
  }[];
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
  completedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
}
