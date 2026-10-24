/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Staff approve a listing Supply Intake built from a nomination, an organizer's own submission or discovery. One transaction publishes the organizer page claimable and noindex, hidden in the app, records the review decision and receipt, and opens the organizer's Sales account, opportunity, tasks and activity.
 */
export interface AdminApproveOrganizerListingCallablePayload {
  /**
   * The reviewer's idempotency key; a retry with the same content replays.
   */
  requestId: string;
  listingWorkItemId: string;
  /**
   * The listing content the reviewer saw. A listing rebuilt since then is refused.
   */
  contentHash: string;
  name: string;
  publicSlug: string;
  marketId: string;
  /**
   * Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.
   */
  organizerType:
    | "club"
    | "community"
    | "individual"
    | "eventProducer"
    | "venue"
    | "brand";
  /**
   * The public-web publication checklist, every item confirmed.
   */
  checklist: {
    identityReviewed: true;
    surfaceInventoryReviewed: true;
    ownerSafeCopyReviewed: true;
    marketScopeReviewed: true;
    mediaRightsReviewed: true;
    crawlDisabledReviewed: true;
    claimTargetReviewed: true;
    takedownPathReviewed: true;
    impersonationReviewed: true;
  };
  note: string;
}
