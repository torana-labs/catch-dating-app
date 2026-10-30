/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipProgramDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_programs.schema.json",
  "title": "HostMembershipProgramDocument",
  "description": "Server-owned per-organizer paid membership program: the payment provider binding snapshot taken when the program was enabled, the host-wide billing pause and member counts.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipPrograms",
  "x-firestore-path": "hostMembershipPrograms/{organizerId}",
  "x-owner": "manageHostMembershipProgram callable and processHostMembershipBillingPause schedule",
  "required": [
    "schemaVersion",
    "organizerId",
    "state",
    "payment",
    "billingPause",
    "memberCount",
    "revision",
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
    "state": {
      "enum": [
        "enabled",
        "disabled"
      ],
      "x-catch-ownership": "server-only"
    },
    "payment": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "provider",
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
    "billingPause": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "requestedAtMillis",
        "requestedBy",
        "processedCount",
        "cursor"
      ],
      "properties": {
        "state": {
          "enum": [
            "active",
            "pausing",
            "paused",
            "resuming"
          ]
        },
        "requestedAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "requestedBy": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 128
        },
        "processedCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "cursor": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 180
        }
      },
      "x-catch-ownership": "server-only"
    },
    "memberCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000000,
      "x-catch-ownership": "server-only"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740990,
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
