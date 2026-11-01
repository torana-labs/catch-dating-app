/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminManageNominatorCreditsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_manage_nominator_credits_response.schema.json",
  "title": "AdminManageNominatorCreditsCallableResponse",
  "description": "Every nominator with credit, their totals by state and whether their owed credit has reached the minimum payout, plus the newest credit entries.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "nominators",
    "credits",
    "minimumPayoutMinor"
  ],
  "properties": {
    "minimumPayoutMinor": {
      "type": "integer",
      "minimum": 0
    },
    "nominators": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "nominatorUid",
          "nominatorRole",
          "owedMinor",
          "approvedMinor",
          "paidMinor",
          "payable",
          "organizerCount"
        ],
        "properties": {
          "nominatorUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "nominatorRole": {
            "enum": [
              "associate",
              "partner",
              "guest",
              "organizer"
            ]
          },
          "owedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "approvedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "paidMinor": {
            "type": "integer",
            "minimum": 0
          },
          "payable": {
            "type": "boolean"
          },
          "organizerCount": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "credits": {
      "type": "array",
      "maxItems": 2000,
      "items": {
        "title": "NominatorCreditDocument",
        "description": "One credit a nominator earned from one paid organizer bill, keyed by the bill. Written when a bill is paid, under the nominator credit rule in moneySettings: the first nominator of the organizer, if their role earns credit and the organizer claimed within the lapse window, earns the rate on what the organizer paid Catch before GST, for the set number of months from the organizer's first paid bill. Owed credit is approved monthly per nominator once it reaches the minimum (less rolls over), then marked paid with partner payouts.",
        "type": "object",
        "additionalProperties": false,
        "x-firestore-collection": "nominatorCredits",
        "x-firestore-path": "nominatorCredits/{creditId}",
        "x-document-id-field": "creditId",
        "x-owner": "Functions organizer billing (bill paid) and adminManageNominatorCredits",
        "required": [
          "schemaVersion",
          "creditId",
          "billId",
          "organizerId",
          "organizerName",
          "nominatorUid",
          "nominatorRole",
          "billMonth",
          "monthIndex",
          "billPaidMinor",
          "rateBasisPoints",
          "creditMinor",
          "status",
          "approvedAtMillis",
          "approvedByUid",
          "paidAtMillis",
          "paidByUid",
          "createdAtMillis",
          "updatedAtMillis"
        ],
        "properties": {
          "schemaVersion": {
            "const": 1
          },
          "creditId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "billId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "organizerName": {
            "type": "string",
            "maxLength": 160
          },
          "nominatorUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "nominatorRole": {
            "enum": [
              "associate",
              "partner",
              "guest",
              "organizer"
            ]
          },
          "billMonth": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "monthIndex": {
            "type": "integer",
            "minimum": 1,
            "maximum": 60,
            "description": "Which month of credit this is, counted from the organizer's first paid bill."
          },
          "billPaidMinor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000000
          },
          "rateBasisPoints": {
            "type": "integer",
            "minimum": 0,
            "maximum": 10000
          },
          "creditMinor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100000000000
          },
          "status": {
            "enum": [
              "owed",
              "approved",
              "paid"
            ]
          },
          "approvedAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "approvedByUid": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 128
          },
          "paidAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "paidByUid": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 128
          },
          "createdAtMillis": {
            "type": "integer",
            "minimum": 1
          },
          "updatedAtMillis": {
            "type": "integer",
            "minimum": 1
          }
        }
      }
    }
  }
} as const;
