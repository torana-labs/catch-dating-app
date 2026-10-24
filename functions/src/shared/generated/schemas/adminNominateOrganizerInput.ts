/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminNominateOrganizerCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_nominate_organizer_payload.schema.json",
  "title": "AdminNominateOrganizerCallablePayload",
  "description": "A Catch sales associate nominates an organizer. Supply Intake builds the listing from the name and links; nothing is published until staff review it.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "requestId",
    "name",
    "market",
    "urls",
    "notes",
    "categories"
  ],
  "properties": {
    "requestId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
    },
    "name": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 160
    },
    "market": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "urls": {
      "type": "array",
      "maxItems": 10,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 2000,
        "pattern": "^https?://"
      }
    },
    "notes": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 2000
    },
    "categories": {
      "type": "array",
      "maxItems": 8,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]{0,59}$"
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "name": {
            "type": "null"
          }
        }
      },
      "then": {
        "properties": {
          "urls": {
            "minItems": 1
          }
        }
      }
    }
  ],
  "x-callable-aliases": [
    "adminNominateOrganizer"
  ]
} as const;
