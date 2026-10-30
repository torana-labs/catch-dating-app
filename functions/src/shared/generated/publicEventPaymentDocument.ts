/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-owned public OTP checkout. Holds and financial recovery share the event payment engine; no application approval or form-offer identity is implied.
 */
export interface PublicEventPaymentDocument {
  organizerId: string;
  eventId: string;
  recipientUid: string;
  requestId: string;
  canonicalSeatKey: string;
  identityRevision: number;
  migrationRevision: number;
  routing: {
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
  amountPaise: number;
  currency: "INR";
  receipt: string;
  status:
    | "creatingOrder"
    | "orderUnknown"
    | "checkoutReady"
    | "verifying"
    | "captured"
    | "admitted"
    | "expired"
    | "refundPending"
    | "refunded"
    | "reviewRequired"
    | "failed"
    | "cancelled";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  admissionReceiptId: string | null;
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
  admittedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  lastErrorCode: string | null;
  /**
   * Durable Route hold-release intent and provider observation. Release is separate from settled funds. Optional only for pre-admission and older attempts.
   */
  settlement?: {
    state:
      | "waiting"
      | "releasePending"
      | "released"
      | "settled"
      | "blocked"
      | "reviewRequired"
      | "reversed";
    transferId: string | null;
    nextAttemptAtMillis: number;
    leaseUntilMillis: number;
    leaseId: string | null;
    authorizedAtMillis: number | null;
    completedAtMillis: number | null;
    releasedAtMillis: number | null;
    settledAtMillis: number | null;
  };
  cancellation?: {
    reason: "eventCancelled" | "guestCancelled";
    requestedAtMillis: number;
    attendeeId: string;
    refundAmountPaise: number;
    seatRetained: boolean;
  };
  cancellationPolicy: {
    refundDeadlineMillis: number;
    eventStartsAtMillis: number;
  };
  registrationRevision: number;
  attendeeId: string;
  phoneE164: string;
  displayName: string;
  eventName: string;
  requestHash: string;
  inviteLinkId: string | null;
}
