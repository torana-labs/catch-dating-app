/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned live guidance assignment stored at eventSuccessAssignments/{eventId_moduleId_uid}.
 */
export interface EventSuccessAssignmentDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  moduleId: "micro_pods" | "guided_rotations";
  label: string;
  displayTitle: string;
  displaySubtitle?: string | null;
  /**
   * @maxItems 20
   */
  peerUids: string[];
  unitKind?: "wholeGroup" | "pods" | "pairs" | "teams" | "tables";
  unitIndex?: number;
  unitLabel?: string;
  layoutUnitId?: string;
  confirmedLayoutUnitId?: string | null;
  whySummary?: string;
  /**
   * @maxItems 12
   */
  whyCodes?: (
    | "host_override"
    | "mutual_interest"
    | "one_way_interest"
    | "questionnaire_match"
    | "social_fallback"
    | "balanced_group"
    | "fresh_peer"
    | "repeat_peer"
    | "sit_out"
    | "pair_slot"
    | "pod_slot"
    | "table_slot"
    | "team_slot"
    | "whole_group_slot"
  )[];
  rotationFairness?: {
    assignedRoundCount: number;
    sitOutRoundCount: number;
    uniquePeerCount: number;
    repeatPeerCount: number;
  };
  /**
   * @maxItems 24
   */
  sitOutSlots?: {
    roundIndex: number;
    label: string;
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    startsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    endsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    whySummary: string;
    /**
     * @maxItems 12
     */
    whyCodes: "sit_out"[];
  }[];
  /**
   * @maxItems 24
   */
  rotationSlots?: {
    slotId?: string;
    roundIndex: number;
    label: string;
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    startsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    endsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    peerUid: string;
    unitKind?: "pairs";
    unitIndex?: number;
    resourceUnitId?: string;
    peerCount?: number;
    compatibility:
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social"
      | "host_override";
    whySummary?: string;
    /**
     * @maxItems 12
     */
    whyCodes?: (
      | "host_override"
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social_fallback"
      | "fresh_peer"
      | "repeat_peer"
      | "pair_slot"
    )[];
  }[];
  /**
   * @maxItems 24
   */
  groupRotationSlots?: {
    slotId?: string;
    roundIndex: number;
    label: string;
    unitLabel: string;
    unitKind?: "wholeGroup" | "pods" | "pairs" | "teams" | "tables";
    unitIndex?: number;
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    startsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    endsAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    /**
     * @maxItems 20
     */
    peerUids: string[];
    peerCount?: number;
    compatibility:
      | "mutual_interest"
      | "one_way_interest"
      | "questionnaire_match"
      | "social"
      | "mixed"
      | "host_override";
    whySummary?: string;
    /**
     * @maxItems 12
     */
    whyCodes?: (
      | "host_override"
      | "mutual_interest"
      | "questionnaire_match"
      | "social_fallback"
      | "balanced_group"
      | "fresh_peer"
      | "repeat_peer"
      | "pair_slot"
      | "pod_slot"
      | "table_slot"
      | "team_slot"
      | "whole_group_slot"
    )[];
  }[];
  source: "server_v1" | "host_override_v1" | "server";
  /**
   * Opaque, public-safe identity of the feature inputs used by a server assignment. Raw answer and source identifiers remain private.
   */
  assignmentFeatureAudit?: {
    algorithmVersion: "typed-soft-features-v1";
    configHash: string;
    inputSnapshotId: string;
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
