/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {NominatorCreditDocument} from "./nominatorCreditDocument";

/**
 * Every nominator with credit, their totals by state and whether their owed credit has reached the minimum payout, plus the newest credit entries.
 */
export interface AdminManageNominatorCreditsCallableResponse {
  minimumPayoutMinor: number;
  /**
   * @maxItems 1000
   */
  nominators: {
    nominatorUid: string;
    nominatorRole: "associate" | "partner" | "guest" | "organizer";
    owedMinor: number;
    approvedMinor: number;
    paidMinor: number;
    payable: boolean;
    organizerCount: number;
  }[];
  /**
   * @maxItems 2000
   */
  credits: NominatorCreditDocument[];
}
