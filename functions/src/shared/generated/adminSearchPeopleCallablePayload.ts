/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Search people by name, phone or user id; every search is written to the admin audit log.
 */
export interface AdminSearchPeopleCallablePayload {
  query: string;
  limit: number;
}
