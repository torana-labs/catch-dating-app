/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of the organizers the caller nominated, newest first, with what happened to each.
 */
export interface AdminListMyNominationsCallablePayload {
  filter: "all" | "published" | "waiting" | "stuck";
  limit: number;
  cursor: string | null;
}
