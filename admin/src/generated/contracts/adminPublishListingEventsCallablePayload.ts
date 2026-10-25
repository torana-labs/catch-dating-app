/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * A staff member publishes, or dry-runs, some or all of the events Supply Intake imported for one approved organizer listing as read-only, outbound-only externalEvents. Each event is planned and checked on its own; blocked events are reported, not written. Their resolutions or cited policy waivers clear governed blockers per event.
 */
export interface AdminPublishListingEventsCallablePayload {
  intakeRequestId: string;
  /**
   * @minItems 1
   * @maxItems 60
   */
  eventWorkItemIds: string[];
  executionMode: "dry_run" | "apply";
  /**
   * The reviewer's key; each event's receipt is keyed on it, so a retry replays.
   */
  idempotencyKey: string;
  reviewNote: string;
  checklist: {
    outboundLinksReviewed: boolean;
    noCatchBookingPaymentsWaitlist: boolean;
    ownerSafeCopyReviewed: boolean;
  };
  /**
   * @maxItems 120
   */
  blockerResolutions: {
    eventWorkItemId: string;
    blockerCode:
      | "missing_exact_coordinates"
      | "missing_end_time"
      | "missing_location_detail"
      | "requires_event_defaults_policy"
      | "requires_owner_safe_copy_review"
      | "duplicate_normalized_event_key";
    outcome: "resolved" | "waived";
    policyGapDecisionId: string | null;
    note: string;
  }[];
}
