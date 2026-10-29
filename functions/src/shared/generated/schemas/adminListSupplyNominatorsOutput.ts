/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListSupplyNominatorsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_list_supply_nominators_response.schema.json",
  "title": "AdminListSupplyNominatorsCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "nominators"
  ],
  "properties": {
    "nominators": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "nominatorId",
          "channel",
          "phoneLast4",
          "role",
          "uid",
          "displayName",
          "defaultMarket",
          "active",
          "updatedAt"
        ],
        "properties": {
          "nominatorId": {
            "type": "string",
            "pattern": "^whatsapp-[a-f0-9]{64}$"
          },
          "channel": {
            "type": "string",
            "enum": [
              "whatsapp"
            ]
          },
          "phoneLast4": {
            "type": "string",
            "pattern": "^[0-9]{4}$"
          },
          "role": {
            "type": "string",
            "enum": [
              "associate",
              "partner"
            ]
          },
          "uid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
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
            "pattern": "^[a-z][a-z0-9-]{1,49}$"
          },
          "active": {
            "type": "boolean"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    }
  }
} as const;
