/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Canonical match document stored at matches/{matchId}.
 */
export interface MatchDocument {
  user1Id: string;
  user2Id: string;
  /**
   * @minItems 0
   */
  eventIds: string[];
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  lastMessageAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  unreadCounts: {
    [k: string]: number;
  };
  status: "active" | "blocked" | "closed";
  blockedBy: string | null;
  blockedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  /**
   * @minItems 2
   * @maxItems 2
   */
  participantIds: string[];
  conversationType?: "match" | "organizerHostInquiry" | "crossPathsEventPlan";
  organizerId?: string;
  crossPathsInvitationId?: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  eventPlanExpiresAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  closedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
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
