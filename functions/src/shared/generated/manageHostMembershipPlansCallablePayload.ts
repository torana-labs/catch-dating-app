/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Organizer-manager plan management: list every plan, save a draft or edit, publish (creates provider prices) and archive (stops new joins).
 */
export type ManageHostMembershipPlansCallablePayload =
  | {
      action: "list";
      organizerId: string;
    }
  | {
      action: "save";
      organizerId: string;
      planId: null | string;
      plan: {
        name: string;
        description: string;
        prices: {
          monthly?: {
            /**
             * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
             */
            amountPaise: number;
          };
          annual?: {
            /**
             * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
             */
            amountPaise: number;
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
        sortOrder: number;
      };
      expectedRevision: number | null;
    }
  | {
      action: "publish";
      organizerId: string;
      planId: string;
    }
  | {
      action: "archive";
      organizerId: string;
      planId: string;
    };
