/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of the Admin activity log, newest first: people's decisions and agent receipts, filterable to problems.
 */
export interface AdminListActivityLogCallablePayload {
  filter: "all" | "problems" | "decisions" | "agents";
  limit: number;
  cursor: string | null;
}
