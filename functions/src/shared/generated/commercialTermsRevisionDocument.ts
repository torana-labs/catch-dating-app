/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Immutable history of every commercial terms revision, keyed <termsId>_r<revision>. Created in the same transaction as the commercialTerms write it records and never updated.
 */
export interface CommercialTermsRevisionDocument {
  schemaVersion: 1;
  termsId: string;
  scope: "platform" | "organizer";
  organizerId: string | null;
  revision: number;
  terms:
    | {
        currency: "INR";
        commission: {
          rateBasisPoints: number;
          /**
           * Cap per cycle in minor units; null means uncapped.
           */
          capMinor: number | null;
          cycleDays: number;
          cycleAnchor: "trialEnd";
          base: "netOfRefunds" | "gross";
          /**
           * exclusive: amounts are before GST, which is added on top.
           */
          taxTreatment: "exclusive" | "inclusive";
        };
        trial: {
          days: number;
          anchor: "firstEvent";
        };
        toolsOnly: {
          /**
           * Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission.
           */
          feeMinor: number;
        };
        gatewayFeeBearer: "host" | "platform";
        purposes: {
          eventAdmission: {
            countsTowardCommission: boolean;
            /**
             * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
             */
            atSourceFeeBasisPoints: number;
          };
          formFee: {
            countsTowardCommission: boolean;
            /**
             * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
             */
            atSourceFeeBasisPoints: number;
          };
          hostMembership: {
            countsTowardCommission: boolean;
            /**
             * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
             */
            atSourceFeeBasisPoints: number;
          };
        };
      }
    | {
        commission?: {
          rateBasisPoints?: number;
          capMinor?: number | null;
          cycleDays?: number;
          cycleAnchor?: "trialEnd";
          base?: "netOfRefunds" | "gross";
          taxTreatment?: "exclusive" | "inclusive";
        };
        trial?: {
          days?: number;
          anchor?: "firstEvent";
        };
        toolsOnly?: {
          feeMinor?: number;
        };
        gatewayFeeBearer?: "host" | "platform";
        purposes?: {
          eventAdmission?: {
            countsTowardCommission?: boolean;
            atSourceFeeBasisPoints?: number;
          };
          formFee?: {
            countsTowardCommission?: boolean;
            atSourceFeeBasisPoints?: number;
          };
          hostMembership?: {
            countsTowardCommission?: boolean;
            atSourceFeeBasisPoints?: number;
          };
        };
      };
  reason: string;
  actorUid: string;
  createdAtMillis: number;
}
