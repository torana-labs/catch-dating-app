/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned aggregate event coaching metrics stored at eventSuccessScorecards/{eventId}. Raw attendee feedback remains private.
 */
export interface EventSuccessScorecardDocument {
  eventId: string;
  organizerId: string;
  bookedCount: number;
  checkedInCount: number;
  feedbackCount: number;
  attendeesWhoMetTwoPlusPeople: number;
  catchSentCount: number;
  attendeesWhoCaughtSomeone: number;
  catchRecipientCount: number;
  catchRate: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  averageWelcomeRating: number;
  averageStructureRating: number;
  safetyIncidentCount: number;
  /**
   * Host-visible aggregate conversation outcomes. Person-to-person edges remain in attendee-private documents.
   */
  conversationGraph?: {
    responseCount: number;
    skippedCount: number;
    conversationCount: number;
    attendeesWithTwoPlusConversations: number;
    excludedAttendeeCount: number;
    assignedConversationCount: number;
    assignedOpportunityCount: number;
  };
  /**
   * Host-visible operating funnel from acquisition through connection. Counts are aggregate-only and rebuilt from canonical documents.
   */
  funnel: {
    inviteLinkCount: number;
    inviteOpenCount: number;
    totalDemandCount: number;
    requestCount: number;
    pendingRequestCount: number;
    approvedRequestCount: number;
    declinedRequestCount: number;
    directSignupCount: number;
    waitlistJoinCount: number;
    waitlistOfferCount: number;
    waitlistOfferActiveCount: number;
    waitlistOfferAcceptedCount: number;
    waitlistOfferDeclinedCount: number;
    waitlistOfferExpiredCount: number;
    checkoutStartedCount: number;
    paymentPendingCount: number;
    paymentCompletedCount: number;
    paymentFailedCount: number;
    paymentRefundedCount: number;
    bookedCount: number;
    checkedInCount: number;
    noShowCount: number;
    catchSentCount: number;
    attendeesWhoCaughtSomeone: number;
    mutualMatchCount: number;
    chatStartedCount: number;
    repeatAttendeeCount: number;
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
