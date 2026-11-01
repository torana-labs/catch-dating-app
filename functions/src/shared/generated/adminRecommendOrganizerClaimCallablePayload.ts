/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Ops recommend approving or rejecting a pending organizer claim; the owner decides it.
 */
export interface AdminRecommendOrganizerClaimCallablePayload {
  requestId: string;
  decision: "approve" | "reject";
  note: string;
}
