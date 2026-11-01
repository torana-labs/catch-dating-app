/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManagePlatformCostsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_manage_platform_costs_response.schema.json",
  "title": "AdminManagePlatformCostsCallableResponse",
  "description": "One month's costs: what is stored, the WhatsApp estimate used while no WhatsApp invoice total is stored, messages sent, and the month's total.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "month",
    "costs",
    "whatsapp",
    "totalMinor",
    "adSpend"
  ],
  "properties": {
    "month": {
      "type": "string",
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "costs": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "title": "PlatformCostDocument",
        "description": "What one kind of cost came to in one India-time calendar month, platformCosts/{YYYY-MM}_{category}. The owner enters AI, Cloud, SMS and any invoice total by hand; WhatsApp falls back to an estimate from reserved dispatch costs while no invoice total is entered; ad spend arrives from the ad platform once its account is connected.",
        "type": "object",
        "additionalProperties": false,
        "x-firestore-collection": "platformCosts",
        "x-firestore-path": "platformCosts/{costId}",
        "x-document-id-field": "costId",
        "x-owner": "adminManagePlatformCosts and ad spend imports",
        "required": [
          "schemaVersion",
          "costId",
          "month",
          "category",
          "amountMinor",
          "source",
          "note",
          "updatedAtMillis",
          "updatedByUid"
        ],
        "definitions": {
          "category": {
            "enum": [
              "whatsapp",
              "ai",
              "cloud",
              "sms",
              "ads_meta",
              "ads_google",
              "other"
            ]
          }
        },
        "properties": {
          "schemaVersion": {
            "const": 1
          },
          "costId": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])_[a-z_]+$"
          },
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "category": {
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
          "amountMinor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000000
          },
          "source": {
            "enum": [
              "manual",
              "meta_api",
              "google_ads_api"
            ]
          },
          "note": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 500
          },
          "updatedAtMillis": {
            "type": "integer",
            "minimum": 1
          },
          "updatedByUid": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 128
          }
        }
      }
    },
    "whatsapp": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "estimateMinor",
        "messageCount",
        "usesEstimate"
      ],
      "properties": {
        "estimateMinor": {
          "type": "integer",
          "minimum": 0
        },
        "messageCount": {
          "type": "integer",
          "minimum": 0
        },
        "usesEstimate": {
          "type": "boolean"
        }
      }
    },
    "totalMinor": {
      "type": "integer",
      "minimum": 0
    },
    "adSpend": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "metaConnected",
        "googleConnected"
      ],
      "properties": {
        "metaConnected": {
          "type": "boolean"
        },
        "googleConnected": {
          "type": "boolean"
        }
      }
    }
  }
} as const;
