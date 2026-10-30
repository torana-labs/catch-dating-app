/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Current checkout progress and, once authorized, the resulting membership status.
 */
export interface ManageHostMembershipCheckoutCallableResponse {
  checkoutId: string;
  state: "creating" | "open" | "authorized" | "expired" | "failed";
  authorizationUrl: string | null;
  expiresAtMillis: number;
  membershipId: null | string;
  membershipStatus:
    | null
    | ("trialing" | "active" | "past_due" | "paused" | "canceling" | "expired");
}
