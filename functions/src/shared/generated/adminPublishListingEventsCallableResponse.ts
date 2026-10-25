/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminPublishListingEventsCallableResponse {
  intakeRequestId: string;
  organizerId: string | null;
  executionMode: "dry_run" | "apply";
  /**
   * @maxItems 60
   */
  results: {
    eventWorkItemId: string;
    eventId: string | null;
    outcome:
      | "published"
      | "would_publish"
      | "already_published"
      | "withdrawn"
      | "blocked"
      | "awaiting_staff";
    /**
     * @maxItems 30
     */
    blockers: string[];
    receiptPath: string | null;
    idempotent: boolean;
  }[];
  counts: {
    published: number;
    wouldPublish: number;
    alreadyPublished: number;
    withdrawn: number;
    blocked: number;
  };
}
