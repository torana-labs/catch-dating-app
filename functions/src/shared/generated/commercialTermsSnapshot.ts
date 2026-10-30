/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Effective terms for one purpose and organizer at the moment a payment or charge was created.
 */
export interface CommercialTermsSnapshot {
  version: 1;
  purpose: "eventAdmission" | "formFee" | "hostMembership";
  organizerId: string;
  platformRevision: number;
  organizerRevision: number;
  /**
   * hostCollected: the guest pays the organizer's own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch's platform account collects and transfers the organizer's share (Razorpay Route), deducting any at-source fee.
   */
  moneyFlow: "hostCollected" | "platformSplit";
  merchantOfRecord: "host" | "platform";
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
  purposeTerms: {
    countsTowardCommission: boolean;
    /**
     * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
     */
    atSourceFeeBasisPoints: number;
  };
  resolvedAtMillis: number;
}
