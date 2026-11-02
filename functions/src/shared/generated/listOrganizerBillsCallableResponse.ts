/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Catch's bills to one organizer as its owner sees them, newest month first: bills sent or closed and free months. A bill not yet sent is left out, and so are its reminders, history, terms revisions and who acted on it, which stay with Catch's staff.
 */
export interface ListOrganizerBillsCallableResponse {
  /**
   * @maxItems 240
   */
  bills: {
    billId: string;
    month: string;
    status: "sent" | "paid" | "writtenOff" | "free";
    sales: {
      paymentCount: number;
      eventCount: number;
      grossMinor: number;
      refundedMinor: number;
      /**
       * Razorpay's fees on these sales including their tax, taken from the organizer's account.
       */
      providerFeeMinor: number;
    };
    commission: {
      amountMinor: number;
      capMinor: number | null;
      capped: boolean;
      trialWaivedMinor: number;
    };
    gst: {
      registered: boolean;
      amountMinor: number;
    };
    totalMinor: number;
    invoiceNumber: string | null;
    dueAtMillis: number | null;
    /**
     * The Razorpay payment link, only while the bill is unpaid.
     */
    paymentUrl: string | null;
    paidAtMillis: number | null;
    paidMinor: number | null;
  }[];
}
