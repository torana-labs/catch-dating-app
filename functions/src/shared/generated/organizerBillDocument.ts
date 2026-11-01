/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Catch's monthly bill to one organizer, made from the bookings paid into the organizer's own account (hostCollected) in one calendar month, India time. Commission uses each payment's frozen terms (or the organizer's current terms when a payment has none), the free trial, and the monthly cap from the organizer's current terms. GST is added only while Settings → Payments says Catch is GST registered. An invoice number is taken from the financial year's unbroken sequence when the bill is sent. Server-only; Admin reads and acts on it through adminManageOrganizerBills.
 */
export interface OrganizerBillDocument {
  schemaVersion: 1;
  billId: string;
  organizerId: string;
  organizerName: string;
  month: string;
  periodStartMillis: number;
  periodEndMillis: number;
  revision: number;
  /**
   * toSend: made, not sent. sent: sent with its invoice number and due date; overdue is sent past its due date. paid, writtenOff: closed. free: nothing due because every sale fell in the free trial.
   */
  status: "toSend" | "sent" | "paid" | "writtenOff" | "free";
  sales: {
    paymentCount: number;
    eventCount: number;
    grossMinor: number;
    refundedMinor: number;
    /**
     * What commission is charged on: gross or net of refunds, per the terms.
     */
    baseMinor: number;
    /**
     * Razorpay's fees on these sales, taken from the organizer's account; shown for their records.
     */
    providerFeeMinor: number;
    providerTaxMinor: number;
    /**
     * Payments that froze no terms and were charged on the organizer's current terms.
     */
    unsnapshottedCount: number;
  };
  commission: {
    /**
     * The organizer's current rate; individual payments may have frozen another.
     */
    rateBasisPoints: number;
    uncappedMinor: number;
    capMinor: number | null;
    capped: boolean;
    trialWaivedMinor: number;
    amountMinor: number;
  };
  trialEndsAtMillis: number | null;
  terms: {
    platformRevision: number;
    organizerRevision: number;
    ownTerms: boolean;
  };
  gst: {
    registered: boolean;
    rateBasisPoints: number;
    amountMinor: number;
  };
  totalMinor: number;
  invoiceNumber: string | null;
  dueAtMillis: number | null;
  paymentLink: null | {
    linkId: string;
    url: string;
  };
  sentAtMillis: number | null;
  /**
   * @maxItems 24
   */
  reminders: number[];
  paidAtMillis: number | null;
  paidMinor: number | null;
  paidVia: "paymentLink" | "manual" | null;
  writtenOffAtMillis: number | null;
  /**
   * @maxItems 60
   */
  history: {
    atMillis: number;
    action:
      | "generated"
      | "regenerated"
      | "sent"
      | "reminded"
      | "paid"
      | "writtenOff";
    byUid: string | null;
    note: string | null;
  }[];
  generatedAtMillis: number;
  updatedAtMillis: number;
}
