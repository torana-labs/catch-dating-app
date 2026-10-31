/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Attendee-owned compatibility questionnaire answers stored at eventSuccessCompatibilityResponses/{eventId_uid}. Hosts cannot read individual answers.
 */
export interface EventSuccessCompatibilityResponseDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  answerIds: string[];
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
   * Internal demo seed marker used for cleanup and diagnostics.
   */
  synthetic?: boolean;
  /**
   * Internal demo seed prefix used for cleanup and diagnostics.
   */
  seedPrefix?: string;
  /**
   * Internal demo seed scenario name used for cleanup and diagnostics.
   */
  scenario?: string;
  /**
   * Internal demo-operations marker used for cleanup and diagnostics.
   */
  demoOps?: boolean;
  /**
   * Internal demo-operations id used for cleanup and diagnostics.
   */
  demoOpsId?: string;
  /**
   * Internal demo-operations command name used for cleanup and diagnostics.
   */
  demoOpsCommand?: string;
}
