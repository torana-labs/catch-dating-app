/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Membership status after the member action is applied with the provider.
 */
export interface ManageMyHostMembershipCallableResponse {
  membershipId: string;
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceling"
    | "expired";
  cancelAtPeriodEnd: boolean;
  currentPeriodEndMillis: number | null;
}
