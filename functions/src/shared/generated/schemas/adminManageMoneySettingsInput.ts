/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManageMoneySettingsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_manage_money_settings_payload.schema.json",
  "title": "AdminManageMoneySettingsCallablePayload",
  "description": "Owner reads or replaces Catch's money settings (GST registered, bill due day, nominator credit rule). A replacement names the revision it reviewed (0 when none is stored yet).",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner)",
  "required": [
    "action",
    "expectedRevision",
    "settings"
  ],
  "properties": {
    "action": {
      "enum": [
        "read",
        "replace"
      ]
    },
    "expectedRevision": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "settings": {
      "anyOf": [
        {
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
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
