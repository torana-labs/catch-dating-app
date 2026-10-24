/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminApproveOrganizerListingCallableResponse {
  approvalId: string;
  organizerId: string;
  organizerPath: string;
  /**
   * False when this exact approval had already been applied.
   */
  created: boolean;
  publishStatus: "published";
  indexStatus: "noindex";
  appVisibility: "hidden";
  claimState: "unclaimed";
  salesOwnerUid: string;
}
