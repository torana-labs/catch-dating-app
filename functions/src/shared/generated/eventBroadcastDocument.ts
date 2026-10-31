/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned delivery receipt for an organizer event broadcast stored at eventBroadcasts/{broadcastId}.
 */
export interface EventBroadcastDocument {
  eventId: string;
  organizerId: string;
  actorUid: string;
  audience: "booked" | "prospective" | "everyone";
  title: string;
  body: string;
  /**
   * @maxItems 500
   */
  targetUids: string[];
  status: "processing" | "completed" | "partial" | "failed";
  recipientCount: number;
  excludedCount: number;
  activityAvailableCount: number;
  pushAttemptedCount: number;
  pushAcceptedCount: number;
  pushFailedCount: number;
  pushUnknownCount: number;
  /**
   * @maxItems 20
   */
  pushErrorCodes: string[];
  deliveries: {
    [k: string]: {
      activityStatus: "created" | "existing" | "failed";
      pushStatus: "ineligible" | "accepted" | "failed" | "unknown";
      activityNotificationId: string;
      excluded?: boolean;
      errorCode?: string;
    };
  };
  leaseOwner: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  leaseExpiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  expiresAt: {
    _seconds: number;
    _nanoseconds: number;
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
  completedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
}
