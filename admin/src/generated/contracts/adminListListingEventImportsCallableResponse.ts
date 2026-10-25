/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListListingEventImportsCallableResponse {
  policy: {
    mode: "staff_review" | "auto_publish_approved_organizers";
    policyVersion: string;
  };
  /**
   * @maxItems 10
   */
  rows: {
    intakeRequestId: string;
    listingId: string;
    approvedAt: string;
    organizer: {
      organizerId: string;
      name: string | null;
      canonicalPath: string | null;
      appVisibility: "hidden" | "discoverable";
      pagePublished: boolean;
    };
    /**
     * @maxItems 60
     */
    events: {
      eventWorkItemId: string;
      eventId: string | null;
      title: string | null;
      startAt: string;
      endAt: string | null;
      venue: string | null;
      address: string | null;
      platform: string;
      sourceUrl: string;
      priceLabel: string | null;
      /**
       * published: live on the website. withdrawn: staff took it down. ready: a staff member can publish it with the checklist. needs_resolution: a staff member must resolve or waive resolvableBlockers first. blocked: it cannot publish (ended, cancelled, platform not supported, organizer page unpublished).
       */
      state:
        | "published"
        | "withdrawn"
        | "ready"
        | "needs_resolution"
        | "blocked";
      publishedBy: "policy" | "staff" | null;
      /**
       * @maxItems 20
       */
      blockers: string[];
      /**
       * @maxItems 6
       */
      resolvableBlockers: (
        | "missing_exact_coordinates"
        | "missing_end_time"
        | "missing_location_detail"
        | "requires_event_defaults_policy"
        | "requires_owner_safe_copy_review"
        | "duplicate_normalized_event_key"
      )[];
      /**
       * Why the publication policy left this event for staff, if it did.
       *
       * @maxItems 20
       */
      automatedFindings: {
        check: "dating_framing" | "organizer_attribution";
        field: string;
        match: string;
      }[];
    }[];
  }[];
  nextCursor: string | null;
  unavailableCount: number;
}
