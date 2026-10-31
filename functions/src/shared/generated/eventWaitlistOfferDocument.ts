/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned waitlist offer stored at eventWaitlistOffers/{eventId_uid}. Offers reserve a waitlist slot until accepted, declined, expired, or cancelled.
 */
export interface EventWaitlistOfferDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  cohortAtOffer: string;
  status: "active" | "accepted" | "declined" | "expired" | "cancelled";
  source: "host" | "autoPromotion" | "ratioBalancing" | "cancellation";
  offeredBy: string | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  offeredAt: {
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
  decidedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  expiringNotifiedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  inviteLinkId?: string | null;
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
