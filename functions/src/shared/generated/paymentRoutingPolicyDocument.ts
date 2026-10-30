/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Operator-owned app defaults and organizer overrides. Null inherits at organizer scope and disables at app scope. An explicit disabled selection never inherits.
 */
export type PaymentRoutingPolicyDocument = {
  [k: string]: unknown;
} & {
  scope: "app" | "organizer";
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
  /**
   * Membership money flow: razorpayOAuth is hostCollected (subscriptions on the organizer's own connected account), razorpayRoute is platformSplit. Absent on policies written before memberships had a route, and treated as null.
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
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  lastMutationHash?: string;
};
