/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventMembershipRulesDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_membership_rules.schema.json",
  "title": "EventMembershipRulesDocument",
  "description": "Paid-membership rules for one event: per-plan member price overrides (0 or 100% off = included), an early-access window anchored when first enabled, and a paid-members-only flag. Kept outside eventPolicy so it never changes the seat policy hash or lock.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventMembershipRules",
  "x-firestore-path": "eventMembershipRules/{eventId}",
  "x-document-id-field": "eventId",
  "x-owner": "manageEventMembershipRules callable",
  "required": [
    "schemaVersion",
    "organizerId",
    "eventId",
    "memberPriceOverrides",
    "earlyAccess",
    "membersOnly",
    "revision",
    "updatedAtMillis",
    "updatedBy"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "memberPriceOverrides": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "planId",
              "percentOff"
            ],
            "properties": {
              "planId": {
                "type": "string",
                "pattern": "^hmp_[A-Za-z0-9]{20}$"
              },
              "percentOff": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "planId",
              "priceInPaise"
            ],
            "properties": {
              "planId": {
                "type": "string",
                "pattern": "^hmp_[A-Za-z0-9]{20}$"
              },
              "priceInPaise": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100000000
              }
            }
          }
        ]
      },
      "x-catch-ownership": "callable-owned"
    },
    "earlyAccess": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "hours",
            "anchorMillis",
            "generalSaleOpensAtMillis"
          ],
          "properties": {
            "hours": {
              "type": "integer",
              "minimum": 1,
              "maximum": 168
            },
            "anchorMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            },
            "generalSaleOpensAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "membersOnly": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740990,
      "x-catch-ownership": "callable-owned"
    },
    "updatedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "updatedBy": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
