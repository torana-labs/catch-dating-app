/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface ManagePublicEventCheckoutCallableResponse {
  quote: {
    eventId: string;
    eventName: string;
    registrationRevision: number;
    startTimeMillis: number;
    amountPaise: number;
    currency: "INR";
    cancellationPolicy: {
      refundDeadlineMillis: number;
      eventStartsAtMillis: number;
    };
    /**
     * Present only when a paid host membership price applies: the list price the member would otherwise pay.
     */
    listAmountPaise?: number;
  } | null;
  payment: {
    paymentId: string;
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
    amountPaise: number;
    currency: "INR";
    mode: "test" | "live";
    refundedAmountPaise: number;
    expiresAtMillis: number;
    checkout: {
      publicToken: string;
      orderId: string;
      amountPaise: number;
      currency: "INR";
      description: string;
      expiresAtMillis: number;
    } | null;
    cancellationReason: "eventCancelled" | "guestCancelled" | null;
    cancellationPolicy: {
      refundDeadlineMillis: number;
      eventStartsAtMillis: number;
    } | null;
    cancellationQuote: {
      refundAmountPaise: number;
    } | null;
    eventId: string;
    eventName: string;
    startTimeMillis: number;
  } | null;
  admission: {
    eventId: string;
    attendeeId: string;
    status: "registered" | "checkedIn";
  } | null;
  serverTimeMillis: number;
}
