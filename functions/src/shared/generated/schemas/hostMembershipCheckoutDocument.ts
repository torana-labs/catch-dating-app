/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipCheckoutDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_checkouts.schema.json",
  "title": "HostMembershipCheckoutDocument",
  "description": "One membership purchase attempt: the provider subscription awaiting mandate authorization. The buyer may read their own checkout to follow progress; open checkouts reserve plan capacity until expiry.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipCheckouts",
  "x-firestore-path": "hostMembershipCheckouts/{checkoutId}",
  "x-document-id-field": "checkoutId",
  "x-owner": "manageHostMembershipCheckout callable and the membership webhook",
  "required": [
    "schemaVersion",
    "organizerId",
    "planId",
    "uid",
    "interval",
    "priceInPaise",
    "state",
    "provider",
    "providerSubscriptionId",
    "authorizationUrl",
    "expiresAtMillis",
    "createdAtMillis",
    "updatedAtMillis"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "planId": {
      "type": "string",
      "pattern": "^hmp_[A-Za-z0-9]{20}$",
      "x-catch-ownership": "server-only"
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "interval": {
      "enum": [
        "monthly",
        "annual"
      ],
      "x-catch-ownership": "server-only"
    },
    "priceInPaise": {
      "type": "integer",
      "minimum": 1000,
      "maximum": 1500000,
      "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.",
      "x-catch-ownership": "server-only"
    },
    "state": {
      "enum": [
        "creating",
        "open",
        "authorized",
        "expired",
        "failed"
      ],
      "x-catch-ownership": "server-only"
    },
    "provider": {
      "enum": [
        "razorpay"
      ],
      "x-catch-ownership": "server-only"
    },
    "providerSubscriptionId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^sub_[A-Za-z0-9]{6,40}$",
      "x-catch-ownership": "server-only"
    },
    "payment": {
      "description": "The program binding the subscription was created on. Absent on checkouts created under the original platform-account model.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "provider",
        "moneyFlow",
        "providerAccountId",
        "bindingId",
        "mode"
      ],
      "properties": {
        "provider": {
          "enum": [
            "razorpay"
          ]
        },
        "moneyFlow": {
          "description": "hostCollected: the guest pays the organizer's own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch's platform account collects and transfers the organizer's share (Razorpay Route), deducting any at-source fee.",
          "enum": [
            "hostCollected",
            "platformSplit"
          ]
        },
        "providerAccountId": {
          "type": "string",
          "pattern": "^acc_[A-Za-z0-9]{4,40}$"
        },
        "bindingId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "mode": {
          "enum": [
            "test",
            "live"
          ]
        }
      },
      "x-catch-ownership": "server-only"
    },
    "authorizationUrl": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500,
      "pattern": "^https://",
      "x-catch-ownership": "server-only"
    },
    "expiresAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
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
