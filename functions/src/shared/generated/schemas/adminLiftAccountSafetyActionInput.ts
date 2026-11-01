/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminLiftAccountSafetyActionCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_lift_account_safety_action_payload.schema.json",
  "title": "AdminLiftAccountSafetyActionCallablePayload",
  "description": "Lift one active account safety action early. Ops may lift warnings and restrictions; lifting a suspension or ban is owner-only (or the appeal reviewer, through adminDecideSafetyAppeal).",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "actionId",
    "note"
  ],
  "properties": {
    "actionId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{8,128}$"
    },
    "note": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    }
  },
  "x-callable-aliases": [
    "adminLiftAccountSafetyAction"
  ]
} as const;
