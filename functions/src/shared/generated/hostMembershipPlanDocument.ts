/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One paid membership tier sold by an organizer. Published plans are readable by signed-in users; only the plans callable writes them. Price changes create a new provider price and leave existing members on the price they bought.
 */
export interface HostMembershipPlanDocument {
  schemaVersion: 1;
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
      providerPriceIds: {
        razorpay?: string;
      };
      revision: number;
      /**
       * Account the provider plan was created on. Absent on prices created under the original platform-account model.
       */
      providerAccountId?: string;
    };
    annual?: {
      /**
       * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
       */
      amountPaise: number;
      providerPriceIds: {
        razorpay?: string;
      };
      revision: number;
      /**
       * Account the provider plan was created on. Absent on prices created under the original platform-account model.
       */
      providerAccountId?: string;
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
  createdAtMillis: number;
  updatedAtMillis: number;
  publishedAtMillis: number | null;
}
