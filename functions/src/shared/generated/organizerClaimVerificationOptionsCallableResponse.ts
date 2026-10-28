/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable response returned by getOrganizerClaimVerificationOptions: which ways of proving ownership this listing offers the signed-in user. Staff review stays available whatever this says.
 */
export interface OrganizerClaimVerificationOptionsCallableResponse {
  organizerId: string;
  /**
   * @maxItems 2
   */
  methods: {
    method: "instagramMessage" | "lumaDescription";
    available: boolean;
    /**
     * The listing's Instagram username without @, or its Luma calendar URL.
     */
    proofTarget: string | null;
    /**
     * turnedOff: Catch has not switched this method on. noSourceOnListing: the listing has no Instagram account or Luma calendar to check.
     */
    unavailableReason: ("turnedOff" | "noSourceOnListing") | null;
  }[];
  catchInstagramHandle: string | null;
}
