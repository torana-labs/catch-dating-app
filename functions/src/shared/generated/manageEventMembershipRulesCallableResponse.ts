/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The event's current membership rules and the organizer's non-archived plans the editor can reference.
 */
export interface ManageEventMembershipRulesCallableResponse {
  eventId: string;
  organizerId: string;
  rules: null | {
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
    earlyAccessHours: null | number;
    generalSaleOpensAtMillis: number | null;
    membersOnly: boolean;
    revision: number;
  };
  /**
   * @maxItems 20
   */
  plans: {
    planId: string;
    name: string;
    status: "draft" | "published" | "archived";
    /**
     * @maxItems 3
     */
    benefits: (
      | {
          type: "eventDiscount";
          percentOff: number;
        }
      | {
          type: "earlyAccess";
        }
      | {
          type: "membersOnlyAccess";
        }
    )[];
  }[];
}
