/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const moneySettingsDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/money_settings.schema.json",
  "title": "MoneySettingsDocument",
  "description": "Catch's money settings (Settings → Payments): whether Catch is GST registered (off until the accountant says so; bills carry no GST while off), when bills fall due, and the nominator credit rule. One document, moneySettings/platform; absent means the defaults the owner decided on 1 Nov 2026. Every write bumps revision.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "moneySettings",
  "x-firestore-path": "moneySettings/{settingsId}",
  "x-document-id-field": "settingsId",
  "x-owner": "adminManageMoneySettings",
  "required": [
    "schemaVersion",
    "settingsId",
    "revision",
    "settings",
    "updatedAtMillis",
    "updatedByUid"
  ],
  "definitions": {
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
    }
  },
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "settingsId": {
      "const": "platform"
    },
    "revision": {
      "type": "integer",
      "minimum": 1
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
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "updatedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    }
  }
} as const;
