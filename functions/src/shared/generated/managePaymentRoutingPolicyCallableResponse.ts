/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface ManagePaymentRoutingPolicyCallableResponse {
  policyId: string;
  organizerId: string | null;
  revision: number;
  formFee:
    | (
        | {
            route: "disabled";
          }
        | {
            route:
              | "razorpayRoute"
              | "razorpayOAuth"
              | "stripeConnectDirect"
              | "stripeConnectDestination";
            mode: "test" | "live";
            currency: string;
            merchantCountry: string;
          }
      )
    | null;
  eventAdmission:
    | (
        | {
            route: "disabled";
          }
        | {
            route:
              | "razorpayRoute"
              | "razorpayOAuth"
              | "stripeConnectDirect"
              | "stripeConnectDestination";
            mode: "test" | "live";
            currency: string;
            merchantCountry: string;
          }
      )
    | null;
  hostMembership:
    | (
        | {
            route: "disabled";
          }
        | {
            route:
              | "razorpayRoute"
              | "razorpayOAuth"
              | "stripeConnectDirect"
              | "stripeConnectDestination";
            mode: "test" | "live";
            currency: string;
            merchantCountry: string;
          }
      )
    | null;
  updatedAtMillis: number | null;
}
