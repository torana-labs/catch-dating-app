/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.
 */
export interface CommercialTermsOverride {
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
}
