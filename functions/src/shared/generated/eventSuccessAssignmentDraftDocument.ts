/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {EventSuccessAssignmentDocument} from "./eventSuccessAssignmentDocument";

/**
 * Server-owned host-only precomputed assignment stored at eventSuccessAssignmentDrafts/{eventId_moduleId_uid} until its round is published.
 */
export interface EventSuccessAssignmentDraftDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  moduleId: "guided_rotations";
  roundIndex: number;
  baseAssignmentRevision: number;
  assignment: EventSuccessAssignmentDocument;
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
  assignmentFeatureGuard?: {
    revision: number;
    configHash: string;
    /**
     * @maxItems 8
     */
    snapshots: {
      eventId: string;
      organizerId: string;
      uid: string;
      featureId: string;
      formId: string;
      versionId: string;
      questionId: string;
      transformVersion: number;
      consentReceiptId: string;
      responseId: string;
      value:
        | {
            kind: "category" | "ordinal";
            optionId: string;
          }
        | {
            kind: "set";
            /**
             * @minItems 1
             * @maxItems 40
             */
            optionIds: string[];
          }
        | {
            kind: "number";
            value: number;
          };
    }[];
  };
}
