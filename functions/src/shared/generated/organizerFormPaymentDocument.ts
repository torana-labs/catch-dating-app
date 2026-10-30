/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Durable form fee ledger. Frozen answers remain in the revision-bound response draft; payment is separate from application review and event admission.
 */
export interface OrganizerFormPaymentDocument {
  routing?: {
    version: 1;
    amountMinor: number;
    transferAmountMinor: number | null;
    settlementHold: boolean | null;
    purpose: "formFee" | "eventAdmission";
    organizerId: string;
    selection: {
      route:
        | "razorpayRoute"
        | "razorpayOAuth"
        | "stripeConnectDirect"
        | "stripeConnectDestination";
      mode: "test" | "live";
      currency: string;
      merchantCountry: string;
    };
    policySource: "app" | "organizer" | "legacy";
    appRevision: number;
    organizerRevision: number;
    bindingId: string;
    merchantAccountId: string;
    destinationAccountId: string | null;
    configurationVersion: string;
    checkoutKey: string | null;
    /**
     * Effective commercial terms frozen when the attempt was prepared. Absent on payments prepared before commercial terms existed, or while platform defaults were unconfigured for a hostCollected route; a commission statement reviews those explicitly.
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
  };
  organizerId: string;
  formId: string;
  versionId: string;
  draftId: string;
  respondentUid: string;
  connectionId: string | null;
  accountId: string;
  mode: "test" | "live";
  draftRevision: number;
  answersHash: string;
  identity: {
    displayName: string | null;
    email: string | null;
    phoneE164: string | null;
    searchName: string | null;
    origin: "anonymous" | "respondentGranted" | "organizerAcquired";
  };
  amountPaise: number;
  currency: "INR";
  description: string;
  refundPolicy: string;
  receipt: string;
  status:
    | "creatingOrder"
    | "orderUnknown"
    | "checkoutReady"
    | "verifying"
    | "captured"
    | "submitted"
    | "failed"
    | "expired"
    | "refundPending"
    | "refunded"
    | "reviewRequired";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  responseId: string | null;
  reservationReleased: boolean;
  leaseUntil: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  checkoutExpiresAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  capturedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  submittedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  lastErrorCode: string | null;
}
