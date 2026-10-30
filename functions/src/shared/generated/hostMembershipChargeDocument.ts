/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only ledger of every captured membership charge, keyed by the provider payment id, and the commission statement's membership source. hostCollected charges were paid to the organizer's own account: no fee is deducted and no transfer is made (transfer.state notRequired). platformSplit charges are split to the organizer's Route account minus the at-source fee. Each new charge freezes the effective commercial terms.
 */
export interface HostMembershipChargeDocument {
  schemaVersion: 1;
  membershipId: string;
  organizerId: string;
  uid: string;
  provider: "razorpay";
  providerSubscriptionId: string;
  amountPaise: number;
  feePaise: number;
  transferAmountPaise: number;
  periodStartMillis: number | null;
  periodEndMillis: number | null;
  providerAccountId: string;
  mode: "test" | "live";
  /**
   * Absent on charges recorded under the original platform-account model, which is platformSplit.
   */
  moneyFlow?: "hostCollected" | "platformSplit";
  /**
   * Effective terms frozen when the charge was recorded. Absent on charges recorded before commercial terms existed.
   */
  commercialTerms?: {
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
  };
  transfer: {
    state: "pending" | "requesting" | "created" | "failed" | "notRequired";
    transferId: string | null;
    attempts: number;
    lastError: string | null;
  };
  createdAtMillis: number;
  updatedAtMillis: number;
}
