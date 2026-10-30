/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Operator-owned commercial terms. The platform document holds complete defaults; an organizer document (id org_<sha256(organizerId)>) holds a sparse override. Every write bumps revision and appends an immutable commercialTermsRevisions record and an admin audit log in the same transaction. Direct client access is denied.
 */
export type CommercialTermsDocument = {
  [k: string]: unknown;
} & {
  schemaVersion: 1;
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
  updatedByUid: string;
  updatedAtMillis: number;
  lastMutationHash: string;
};
