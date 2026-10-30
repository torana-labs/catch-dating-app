/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminSetSupplyNominatorCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_set_supply_nominator_response.schema.json",
  "title": "AdminSetSupplyNominatorCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "nominatorId",
    "created",
    "phoneLast4",
    "instagramHandle",
    "defaultMarket",
    "active"
  ],
  "properties": {
    "nominatorId": {
      "type": "string",
      "pattern": "^(?:whatsapp-[a-f0-9]{64}|instagram-[a-z0-9._]{1,30})$"
    },
    "created": {
      "type": "boolean"
    },
    "phoneLast4": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[0-9]{4}$"
    },
    "instagramHandle": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-z0-9._]{1,30}$"
    },
    "defaultMarket": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-z][a-z0-9-]{1,49}$"
    },
    "active": {
      "type": "boolean"
    }
  }
} as const;
