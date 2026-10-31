/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Canonical event roster edge stored at eventParticipations/{participationId}.
 */
export interface EventParticipationDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  status: "signedUp" | "waitlisted" | "attended" | "cancelled" | "deleted";
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
  signedUpAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  waitlistedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  attendedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  cancelledAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  deletedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  genderAtSignup: ("man" | "woman" | "nonBinary" | "other") | null;
  cohortAtSignup?: string | null;
  paymentId: string | null;
  /**
   * Manual-approval request state for request-to-join events. Null for regular waitlist edges.
   */
  hostApprovalStatus?: "pending" | "approved" | "declined" | null;
  hostApprovalDecidedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  hostApprovalDecidedBy?: string | null;
  /**
   * Mirror of the current waitlist offer state for cheap roster and attendee CTA reads.
   */
  waitlistOfferStatus?:
    | ("active" | "accepted" | "declined" | "expired" | "cancelled")
    | null;
  waitlistOfferedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  waitlistOfferExpiresAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  waitlistOfferAcceptedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  waitlistOfferId?: string | null;
  /**
   * Named host invite link that first attributed this participation, when present.
   */
  inviteLinkId?: string | null;
  /**
   * Host-facing source label copied from the invite link for durable reporting.
   */
  inviteSource?: string | null;
  /**
   * Server time when invite attribution was first attached to the roster edge.
   */
  inviteCapturedAt?: {
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
  /**
   * Historical pointer to the active community decision checked by the admission transaction; later revocation does not rewrite this booking evidence.
   */
  communityMembershipAtSignup?: {
    membershipId: string;
    revision: number;
    decisionId: string;
  };
}
