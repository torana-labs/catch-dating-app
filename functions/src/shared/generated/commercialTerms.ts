/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface CommercialTerms {
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
