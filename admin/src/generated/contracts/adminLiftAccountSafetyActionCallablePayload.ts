/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Lift one active account safety action early. Ops may lift warnings and restrictions; lifting a suspension or ban is owner-only (or the appeal reviewer, through adminDecideSafetyAppeal).
 */
export interface AdminLiftAccountSafetyActionCallablePayload {
  actionId: string;
  note: string;
}
