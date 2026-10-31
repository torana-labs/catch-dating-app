/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Opaque event invitation metadata stored at eventInviteLinks/{inviteLinkId}. The public bearer token is stored separately in a server-only secret document.
 */
export interface EventInviteLinkDocument {
  eventId: string;
  organizerId: string;
  hostUid: string;
  label: string;
  source: string | null;
  tokenHash: string;
  contractVersion?: number;
  linkKind?:
    | "hostChannel"
    | "directRecipient"
    | "attendeeReferrer"
    | "promoter"
    | "partner";
  ownerContactId?: string | null;
  ownerUid?: string | null;
  intendedRecipientContactId?: string | null;
  campaignId?: string | null;
  issuanceChannel?:
    | "hostApp"
    | "consumerApp"
    | "runtimeWeb"
    | "campaign"
    | "api"
    | "formAutomation";
  destinationKind?:
    | "catchEvent"
    | "eventRuntime"
    | "externalBooking"
    | "marketingLanding";
  tokenVersion?: number;
  attributionWindowEndsAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  openCount: number;
  likelyHumanOpenCount?: number;
  shareIntentCount?: number;
  verifiedRegistrationCount?: number;
  referredRegistrationCount?: number;
  referredCheckedInCount?: number;
  requestCount: number;
  confirmedCount: number;
  paidCount: number;
  checkedInCount: number;
  catcherCount: number;
  matchCount: number;
  chatStartedCount: number;
  disabledAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
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
}
