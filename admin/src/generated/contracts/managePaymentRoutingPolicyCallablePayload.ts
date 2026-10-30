/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface ManagePaymentRoutingPolicyCallablePayload {
  action: "read" | "replace";
  organizerId: string | null;
  expectedRevision: number | null;
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
  /**
   * Optional so older operator clients keep working: an omitted value keeps the stored membership route.
   */
  hostMembership?:
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
}
