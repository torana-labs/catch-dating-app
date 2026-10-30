/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const supplyNominatorDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/supply_nominators.schema.json",
  "title": "SupplyNominatorDocument",
  "description": "A person staff have allowed to nominate organizers by messaging Catch. A WhatsApp nominator is keyed by the hash of their number, which is the same endpoint hash the WhatsApp receipts use, so the number itself is never stored; only its last four digits are kept so staff can tell entries apart. An Instagram nominator is keyed by their public Instagram username, which the webhook reads for each sender. Each message from an active nominator becomes Supply Intake nominations credited to their Catch account. Their authority (a sales role, or a current partner membership) is checked again on every message.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "supplyNominators",
  "x-firestore-path": "supplyNominators/{nominatorId}",
  "x-document-id-field": "nominatorId",
  "x-owner": "Admin nominator registry callables",
  "required": [
    "schemaVersion",
    "nominatorId",
    "channel",
    "endpointHash",
    "phoneLast4",
    "role",
    "uid",
    "displayName",
    "defaultMarket",
    "active",
    "createdAt",
    "updatedAt",
    "updatedByUid",
    "instagramHandle"
  ],
  "allOf": [
    {
      "if": {
        "properties": {
          "channel": {
            "const": "whatsapp"
          }
        }
      },
      "then": {
        "properties": {
          "nominatorId": {
            "pattern": "^whatsapp-"
          },
          "endpointHash": {
            "type": "string"
          },
          "phoneLast4": {
            "type": "string"
          },
          "instagramHandle": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "channel": {
            "const": "instagram"
          }
        }
      },
      "then": {
        "properties": {
          "nominatorId": {
            "pattern": "^instagram-"
          },
          "endpointHash": {
            "type": "null"
          },
          "phoneLast4": {
            "type": "null"
          },
          "instagramHandle": {
            "type": "string"
          }
        }
      }
    }
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "nominatorId": {
      "type": "string",
      "pattern": "^(?:whatsapp-[a-f0-9]{64}|instagram-[a-z0-9._]{1,30})$"
    },
    "channel": {
      "type": "string",
      "enum": [
        "whatsapp",
        "instagram"
      ]
    },
    "endpointHash": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-f0-9]{64}$"
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
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    }
  }
} as const;
