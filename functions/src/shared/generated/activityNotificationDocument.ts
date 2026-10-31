/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Canonical durable activity notification stored at notifications/{uid}/items/{notificationId}.
 */
export interface ActivityNotificationDocument {
  uid: string;
  type:
    | "message"
    | "match"
    | "eventReminder"
    | "eventSignup"
    | "waitlistPromotion"
    | "waitlistOffer"
    | "waitlistOfferExpiring"
    | "waitlistOfferExpired"
    | "eventCancelled"
    | "eventUpdated"
    | "organizerUpdate"
    | "formResponse"
    | "crossPathsInvitation"
    | "crossPathsInvitationAccepted"
    | "crossPathsInvitationDeclined"
    | "crossPathsPlanCancelled";
  title: string;
  body: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  readAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  matchId?: string | null;
  eventId?: string | null;
  organizerId?: string | null;
  postId?: string | null;
  invitationId?: string | null;
  actorUid?: string | null;
  actorName?: string | null;
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
