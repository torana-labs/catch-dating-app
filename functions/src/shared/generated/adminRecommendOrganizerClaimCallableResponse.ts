/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminRecommendOrganizerClaimCallableResponse {
  requestId: string;
  status: "pending";
  recommendation: {
    decision: "approve" | "reject";
    byUid: string;
    at: string;
    note: string;
  };
}
