/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManagePlatformCostsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_manage_platform_costs_payload.schema.json",
  "title": "AdminManagePlatformCostsCallablePayload",
  "description": "Owner reads one month's costs, sets one kind of cost for the month by hand, or clears a hand-entered cost.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner)",
  "required": [
    "action",
    "month",
    "category",
    "amountMinor",
    "note"
  ],
  "properties": {
    "action": {
      "enum": [
        "list",
        "set",
        "clear"
      ]
    },
    "month": {
      "type": "string",
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "category": {
      "anyOf": [
        {
          "enum": [
            "whatsapp",
            "ai",
            "cloud",
            "sms",
            "ads_meta",
            "ads_google",
            "other"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "amountMinor": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 100000000000
    },
    "note": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500
    }
  }
} as const;
