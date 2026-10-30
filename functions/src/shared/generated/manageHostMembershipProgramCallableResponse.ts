/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Bounded program projection plus readiness facts the host settings screen needs before enabling memberships. routeAccountReady means the payment account the effective money flow needs is ready (a connected Razorpay account for hostCollected, the Route linked account for platformSplit); feeConfigured means Catch's commercial terms resolve. unavailableReason names the first blocker.
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
  /**
   * The organizer's effective membership money flow, or null when Catch has not offered memberships to this organizer.
   */
  paymentMode?: ("hostCollected" | "platformSplit") | null;
  unavailableReason?:
    | (
        | "notOffered"
        | "termsNotConfigured"
        | "razorpayNotConnected"
        | "razorpayNeedsAttention"
        | "subscriptionsNotEnabled"
        | "payoutAccountNotReady"
        | "providerUnavailable"
      )
    | null;
}
