/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One credit a nominator earned from one paid organizer bill, keyed by the bill. Written when a bill is paid, under the nominator credit rule in moneySettings: the first nominator of the organizer, if their role earns credit and the organizer claimed within the lapse window, earns the rate on what the organizer paid Catch before GST, for the set number of months from the organizer's first paid bill. Owed credit is approved monthly per nominator once it reaches the minimum (less rolls over), then marked paid with partner payouts.
 */
export interface NominatorCreditDocument {
  schemaVersion: 1;
  creditId: string;
  billId: string;
  organizerId: string;
  organizerName: string;
  nominatorUid: string;
  nominatorRole: "associate" | "partner" | "guest" | "organizer";
  billMonth: string;
  /**
   * Which month of credit this is, counted from the organizer's first paid bill.
   */
  monthIndex: number;
  billPaidMinor: number;
  rateBasisPoints: number;
  creditMinor: number;
  status: "owed" | "approved" | "paid";
  approvedAtMillis: number | null;
  approvedByUid: string | null;
  paidAtMillis: number | null;
  paidByUid: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
}
