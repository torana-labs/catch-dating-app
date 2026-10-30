/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Member self-serve: pause billing (suspends entitlements), resume, or cancel at the end of the current period.
 */
export interface ManageMyHostMembershipCallablePayload {
  action: "pause" | "resume" | "cancelAtPeriodEnd";
  membershipId: string;
}
