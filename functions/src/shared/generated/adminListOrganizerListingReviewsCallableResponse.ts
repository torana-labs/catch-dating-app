/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminListOrganizerListingReviewsCallableResponse {
  /**
   * @maxItems 50
   */
  rows: {
    requestId: string;
    listingWorkItemId: string;
    kind: "nomination" | "self_submission" | "discovery";
    submittedByRole: "associate" | "partner" | "organizer" | "system";
    submittedAt: string;
    origin:
      | "admin_nomination"
      | "sales_inbound_intent"
      | "message_nomination"
      | "discovery_run"
      | "none";
    market: {
      slug: string;
      marketId: string | null;
      label: string | null;
      /**
       * Whether an organizer can be approved into this market as it stands.
       */
      open: boolean;
    };
    suggestedSlug: string;
    listing: {
      name: string | null;
      description: string | null;
      /**
       * @maxItems 12
       */
      categories: string[];
      /**
       * @maxItems 20
       */
      links: {
        platform: string;
        url: string;
      }[];
      /**
       * @maxItems 40
       */
      gaps: string[];
      eventCount: number;
      researchNeeded: boolean;
      contentHash: string;
      pageCount: number;
      fetchedPageCount: number;
    };
    /**
     * How the listing compares with the organizers Catch already lists. Advisory: it never blocks approval. Null when the listing was not compared, or was built before listings were compared.
     */
    duplicateCheck: null | {
      verdict: "match" | "ambiguous" | "none";
      organizersCompared: number;
      /**
       * The city the comparison was limited to; null when it compared every city.
       */
      citySlug: string | null;
      /**
       * Whether more published organizers existed than were compared.
       */
      truncated: boolean;
      /**
       * @maxItems 12
       */
      candidates: {
        organizerId: string;
        name: string | null;
        score: number;
        band: "match" | "probable" | "review" | "low";
        rationale: string;
      }[];
    };
  }[];
  nextCursor: string | null;
  /**
   * Completed requests on this page whose listing could not be read.
   */
  unavailableCount: number;
  /**
   * Whether the caller's role may approve listings.
   */
  canApprove: boolean;
}
