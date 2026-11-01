/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminDecideSafetyAppealCallableResponse {
  actionId: string;
  outcome: "keep" | "reduce" | "lift";
  replacementActionId: string | null;
}
