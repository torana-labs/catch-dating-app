/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Paid-membership rules for one event: per-plan member price overrides (0 or 100% off = included), an early-access window anchored when first enabled, and a paid-members-only flag. Kept outside eventPolicy so it never changes the seat policy hash or lock.
 */
export interface EventMembershipRulesDocument {
  schemaVersion: 1;
  organizerId: string;
  eventId: string;
  /**
   * @maxItems 10
   */
  memberPriceOverrides: (
    | {
        planId: string;
        percentOff: number;
      }
    | {
        planId: string;
        priceInPaise: number;
      }
  )[];
  earlyAccess: null | {
    hours: number;
    anchorMillis: number;
    generalSaleOpensAtMillis: number;
  };
  membersOnly: boolean;
  revision: number;
  updatedAtMillis: number;
  updatedBy: string;
}
