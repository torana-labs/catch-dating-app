/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Lists account safety actions for the Safety queue: those in force, those with an appeal waiting, or the most recent of any status. Optionally for one account.
 */
export interface AdminListAccountSafetyActionsCallablePayload {
  view: "active" | "appeals" | "recent";
  uid: string | null;
  limit: number;
}
