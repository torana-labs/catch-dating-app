/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads the nominator credit ledger or acts for one nominator. approve approves all their owed credit when it reaches the minimum payout (less rolls over). markPaid records that their approved credit was paid with partner payouts.
 */
export interface AdminManageNominatorCreditsCallablePayload {
  action: "list" | "approve" | "markPaid";
  nominatorUid: string | null;
  note: string | null;
}
