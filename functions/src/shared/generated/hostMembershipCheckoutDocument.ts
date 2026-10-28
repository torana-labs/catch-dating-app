/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One membership purchase attempt: the provider subscription awaiting mandate authorization. The buyer may read their own checkout to follow progress; open checkouts reserve plan capacity until expiry.
 */
export interface HostMembershipCheckoutDocument {
  schemaVersion: 1;
  organizerId: string;
  planId: string;
  uid: string;
  interval: "monthly" | "annual";
  /**
   * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
   */
  priceInPaise: number;
  state: "creating" | "open" | "authorized" | "expired" | "failed";
  provider: "razorpay";
  providerSubscriptionId: string | null;
  authorizationUrl: string | null;
  expiresAtMillis: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}
