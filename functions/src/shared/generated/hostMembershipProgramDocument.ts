/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned per-organizer paid membership program: the payment provider binding snapshot taken when the program was enabled, the host-wide billing pause and member counts.
 */
export interface HostMembershipProgramDocument {
  schemaVersion: 1;
  organizerId: string;
  state: "enabled" | "disabled";
  payment: {
    provider: "razorpay";
    providerAccountId: string;
    bindingId: string;
    mode: "test" | "live";
  };
  billingPause: {
    state: "active" | "pausing" | "paused" | "resuming";
    requestedAtMillis: number | null;
    requestedBy: string | null;
    processedCount: number;
    cursor: string | null;
  };
  memberCount: number;
  revision: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}
