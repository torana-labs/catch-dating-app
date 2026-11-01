/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {MoneyIssueResolutionDocument} from "./moneyIssueResolutionDocument";

/**
 * Money issues for one view, oldest first, with counts per kind, and the outcome of the action just taken.
 */
export interface AdminManagePaymentIssuesCallableResponse {
  view: "open" | "resolved";
  /**
   * @maxItems 500
   */
  issues: {
    issueId: string;
    kind: "payment" | "refund" | "review" | "bill";
    source:
      | "publicEventPayments"
      | "organizerEventOfferPayments"
      | "payments"
      | "organizerBills";
    targetId: string;
    title: string;
    subtitle: string;
    organizerId: string | null;
    organizerName: string | null;
    amountMinor: number;
    waitingSinceMillis: number;
    status: string;
    lastErrorCode: string | null;
    providerPaymentId: string | null;
    eventId: string | null;
    canConfirmBooking: boolean;
    resolution: null | MoneyIssueResolutionDocument;
  }[];
  counts: {
    all: number;
    payment: number;
    refund: number;
    review: number;
    bill: number;
  };
  outcome: null | {
    issueId: string;
    result: "admitted" | "stillWaiting" | "refunding" | "closed";
    statusAfter: string;
  };
}
