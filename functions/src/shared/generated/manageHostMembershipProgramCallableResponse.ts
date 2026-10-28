/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Bounded program projection plus readiness facts the host settings screen needs before enabling memberships.
 */
export interface ManageHostMembershipProgramCallableResponse {
  organizerId: string;
  program: null | {
    state: "enabled" | "disabled";
    provider: "razorpay";
    mode: "test" | "live";
    billingPauseState: "active" | "pausing" | "paused" | "resuming";
    memberCount: number;
    revision: number;
  };
  routeAccountReady: boolean;
  feeConfigured: boolean;
}
