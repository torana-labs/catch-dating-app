/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The account appeals one safety action taken against it. Each action can be appealed once.
 */
export interface SubmitSafetyAppealCallablePayload {
  actionId: string;
  text: string;
}
