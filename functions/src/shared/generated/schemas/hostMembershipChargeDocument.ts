/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipChargeDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_charges.schema.json",
  "title": "HostMembershipChargeDocument",
  "description": "Server-only ledger of one captured membership charge and its Route transfer to the host linked account minus the platform fee. Keyed by the provider payment id.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipCharges",
  "x-firestore-path": "hostMembershipCharges/{chargeId}",
  "x-document-id-field": "chargeId",
  "x-owner": "membership webhook and reconcileHostMembershipCharges schedule",
  "required": [
    "schemaVersion",
    "membershipId",
    "organizerId",
    "uid",
    "provider",
    "providerSubscriptionId",
    "amountPaise",
    "feePaise",
    "transferAmountPaise",
    "periodStartMillis",
    "periodEndMillis",
    "providerAccountId",
    "mode",
    "transfer",
    "createdAtMillis",
    "updatedAtMillis"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "server-only"
    },
    "membershipId": {
      "type": "string",
      "pattern": "^hm_[a-f0-9]{64}$",
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "provider": {
      "enum": [
        "razorpay"
      ],
      "x-catch-ownership": "server-only"
    },
    "providerSubscriptionId": {
      "type": "string",
      "pattern": "^sub_[A-Za-z0-9]{6,40}$",
      "x-catch-ownership": "server-only"
    },
    "amountPaise": {
      "type": "integer",
      "minimum": 100,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "feePaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "transferAmountPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1500000,
      "x-catch-ownership": "server-only"
    },
    "periodStartMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "periodEndMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "providerAccountId": {
      "type": "string",
      "pattern": "^acc_[A-Za-z0-9]{4,40}$",
      "x-catch-ownership": "server-only"
    },
    "mode": {
      "enum": [
        "test",
        "live"
      ],
      "x-catch-ownership": "server-only"
    },
    "transfer": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "transferId",
        "attempts",
        "lastError"
      ],
      "properties": {
        "state": {
          "enum": [
            "pending",
            "requesting",
            "created",
            "failed",
            "notRequired"
          ]
        },
        "transferId": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^trf_[A-Za-z0-9]{6,40}$"
        },
        "attempts": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "lastError": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      },
      "x-catch-ownership": "server-only"
    },
    "createdAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "updatedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    }
  }
} as const;
