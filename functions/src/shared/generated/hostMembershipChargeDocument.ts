/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only ledger of one captured membership charge and its Route transfer to the host linked account minus the platform fee. Keyed by the provider payment id.
 */
export interface HostMembershipChargeDocument {
  schemaVersion: 1;
  membershipId: string;
  organizerId: string;
  uid: string;
  provider: "razorpay";
  providerSubscriptionId: string;
  amountPaise: number;
  feePaise: number;
  transferAmountPaise: number;
  periodStartMillis: number | null;
  periodEndMillis: number | null;
  providerAccountId: string;
  mode: "test" | "live";
  transfer: {
    state: "pending" | "requesting" | "created" | "failed" | "notRequired";
    transferId: string | null;
    attempts: number;
    lastError: string | null;
  };
  createdAtMillis: number;
  updatedAtMillis: number;
}
