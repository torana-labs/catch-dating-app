/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Organizer-manager read and edit of one event's paid-membership rules: member price overrides, early-access hours and the members-only flag.
 */
export type ManageEventMembershipRulesCallablePayload =
  | {
      action: "get" | "clear";
      eventId: string;
    }
  | {
      action: "save";
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
      earlyAccessHours: null | number;
      membersOnly: boolean;
      expectedRevision: number | null;
    };
