/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Canonical club membership edge stored at organizerMemberships/{membershipId}.
 */
export interface OrganizerMembershipDocument {
  organizerId: string;
  uid: string;
  role: "owner" | "host" | "member";
  status: "active" | "left" | "deleted";
  pushNotificationsEnabled: boolean;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  joinedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  leftAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  deletedAt: {
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
