/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminSetSupplyNominatorCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_set_supply_nominator_payload.schema.json",
  "title": "AdminSetSupplyNominatorCallablePayload",
  "description": "Adds or updates someone who may nominate organizers by sending links to Catch's WhatsApp number or Instagram account. Exactly one of phoneE164 and instagramHandle names them. Their messages become Supply Intake nominations credited to the uid. The uid must hold a sales role (associate) or a current partner membership (partner). Setting active to false stops new messages counting; nothing is deleted.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "uid",
    "role",
    "displayName",
    "defaultMarket",
    "active"
  ],
  "properties": {
    "phoneE164": {
      "type": "string",
      "pattern": "^\\+[1-9][0-9]{6,14}$"
    },
    "instagramHandle": {
      "type": "string",
      "pattern": "^[a-z0-9._]{1,30}$"
    },
    "uid": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "role": {
      "type": "string",
      "enum": [
        "associate",
        "partner"
      ]
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "defaultMarket": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 80
    },
    "active": {
      "type": "boolean"
    }
  },
  "x-callable-aliases": [
    "adminSetSupplyNominator"
  ]
} as const;
