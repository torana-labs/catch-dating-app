/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Member checkout: prepare creates a provider subscription and returns its hosted mandate-authorization link; refresh pulls the provider state and applies it.
 */
export type ManageHostMembershipCheckoutCallablePayload =
  | {
      action: "prepare";
      organizerId: string;
      planId: string;
      interval: "monthly" | "annual";
    }
  | {
      action: "refresh";
      checkoutId: string;
    };
