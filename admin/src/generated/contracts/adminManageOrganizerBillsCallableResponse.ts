/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {OrganizerBillDocument} from "./organizerBillDocument";

/**
 * A month's bills, or one organizer's bills across months (month null, organizerId set), newest activity first, with totals and counts per state. overdue counts sent bills past their due date.
 */
export interface AdminManageOrganizerBillsCallableResponse {
  month: string | null;
  organizerId: string | null;
  /**
   * @maxItems 1000
   */
  bills: OrganizerBillDocument[];
  totals: {
    salesMinor: number;
    billedMinor: number;
    paidMinor: number;
  };
  counts: {
    all: number;
    toSend: number;
    sent: number;
    overdue: number;
    paid: number;
    writtenOff: number;
    free: number;
  };
  nextInvoiceNumber: string;
  gstRegistered: boolean;
}
