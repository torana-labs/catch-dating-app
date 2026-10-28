/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Every plan of one organizer in sort order, after the requested action. Provider price ids are never returned.
 */
export interface ManageHostMembershipPlansCallableResponse {
  organizerId: string;
  /**
   * @maxItems 20
   */
  plans: {
    planId: string;
    organizerId: string;
    name: string;
    description: string;
    status: "draft" | "published" | "archived";
    prices: {
      monthly?: {
        /**
         * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
         */
        amountPaise: number;
        revision: number;
      };
      annual?: {
        /**
         * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
         */
        amountPaise: number;
        revision: number;
      };
    };
    memberCap: number | null;
    trialDays: number;
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
    /**
     * @maxItems 8
     */
    perks: string[];
    limits: {
      maxUpcomingMemberPricedBookings: number | null;
    };
    activeMemberCount: number;
    sortOrder: number;
    revision: number;
    publishedAtMillis: number | null;
  }[];
}
