/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManageMoneySettingsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_manage_money_settings_response.schema.json",
  "title": "AdminManageMoneySettingsCallableResponse",
  "description": "The money settings in force (the defaults when none are stored, with revision 0) and the invoice number the next sent bill will take.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "revision",
    "settings",
    "updatedAtMillis",
    "updatedByUid",
    "nextInvoiceNumber"
  ],
  "properties": {
    "revision": {
      "type": "integer",
      "minimum": 0
    },
    "settings": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "gstRegistered",
        "gstRateBasisPoints",
        "billDueDayOfMonth",
        "nominatorCredit"
      ],
      "properties": {
        "gstRegistered": {
          "type": "boolean"
        },
        "gstRateBasisPoints": {
          "type": "integer",
          "minimum": 0,
          "maximum": 10000
        },
        "billDueDayOfMonth": {
          "type": "integer",
          "minimum": 1,
          "maximum": 28,
          "description": "Bills for a month fall due on this day of the next month."
        },
        "nominatorCredit": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "rateBasisPoints",
            "months",
            "lapseDays",
            "minimumPayoutMinor",
            "payoutDayOfMonth",
            "earningRoles"
          ],
          "properties": {
            "rateBasisPoints": {
              "type": "integer",
              "minimum": 0,
              "maximum": 10000,
              "description": "Share of what the organizer paid Catch, before GST."
            },
            "months": {
              "type": "integer",
              "minimum": 1,
              "maximum": 60,
              "description": "Months of credit, counted from the organizer's first paid bill."
            },
            "lapseDays": {
              "type": "integer",
              "minimum": 1,
              "maximum": 366,
              "description": "A nomination lapses when the organizer has not claimed within this many days."
            },
            "minimumPayoutMinor": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000,
              "description": "Credit below this rolls over to the next payout."
            },
            "payoutDayOfMonth": {
              "type": "integer",
              "minimum": 1,
              "maximum": 28
            },
            "earningRoles": {
              "type": "array",
              "uniqueItems": true,
              "maxItems": 4,
              "items": {
                "enum": [
                  "partner",
                  "guest",
                  "organizer",
                  "associate"
                ]
              }
            }
          }
        }
      }
    },
    "updatedAtMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 1
    },
    "updatedByUid": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 128
    },
    "nextInvoiceNumber": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}/[0-9]{3,}$"
    }
  }
} as const;
