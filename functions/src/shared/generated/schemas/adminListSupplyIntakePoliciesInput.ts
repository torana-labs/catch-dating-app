/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListSupplyIntakePoliciesCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_supply_intake_policies_payload.schema.json",
  "title": "AdminListSupplyIntakePoliciesCallablePayload",
  "description": "Lists the Supply Intake capabilities that stay off until the owner records a decision (fetching the pages a nomination names, scheduled event refresh, agent research, model extraction), each with its decision and whether its policy file switches it on.",
  "type": "object",
  "additionalProperties": false,
  "properties": {},
  "x-callable-aliases": [
    "adminListSupplyIntakePolicies"
  ]
} as const;
