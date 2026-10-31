/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListAccountSafetyActionsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_account_safety_actions_payload.schema.json",
  "title": "AdminListAccountSafetyActionsCallablePayload",
  "description": "Lists account safety actions for the Safety queue: those in force, those with an appeal waiting, or the most recent of any status. Optionally for one account.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "view",
    "uid",
    "limit"
  ],
  "properties": {
    "view": {
      "type": "string",
      "enum": [
        "active",
        "appeals",
        "recent"
      ]
    },
    "uid": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
    }
  },
  "x-callable-aliases": [
    "adminListAccountSafetyActions"
  ]
} as const;
