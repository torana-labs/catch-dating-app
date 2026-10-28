/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_memberships.schema.json",
  "title": "HostMembershipDocument",
  "description": "One member's paid membership with one organizer, keyed hm_<sha256([organizerId, uid])> so a rejoining member keeps tenure. Written only by the membership state machine from verified provider evidence and member/host intents. Distinct from organizerCommunityMemberships (unpaid approval grants).",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMemberships",
  "x-firestore-path": "hostMemberships/{membershipId}",
  "x-document-id-field": "membershipId",
  "x-owner": "host membership state machine (webhook, checkout refresh, self-serve and billing-pause callables)",
  "required": [
    "schemaVersion",
    "organizerId",
    "uid",
    "planId",
    "planName",
    "interval",
    "status",
    "statusReason",
    "priceInPaise",
    "currency",
    "currentPeriodStartMillis",
    "currentPeriodEndMillis",
    "trialEndsAtMillis",
    "cancelAtPeriodEnd",
    "pause",
    "pastDueSinceMillis",
    "memberSinceMillis",
    "tenure",
    "provider",
    "providerSubscriptionId",
    "providerPlanId",
    "providerEventAtMillis",
    "lastCheckoutId",
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
    "uid": {
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
    "planName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60,
      "x-catch-ownership": "server-only"
    },
    "interval": {
      "enum": [
        "monthly",
        "annual"
      ],
      "x-catch-ownership": "server-only"
    },
    "status": {
      "enum": [
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceling",
        "expired"
      ],
      "x-catch-ownership": "server-only"
    },
    "statusReason": {
      "enum": [
        null,
        "memberPaused",
        "hostPaused",
        "paymentFailed",
        "memberCanceled",
        "planCompleted",
        "providerCanceled"
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
    "currency": {
      "const": "INR",
      "x-catch-ownership": "server-only"
    },
    "currentPeriodStartMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "currentPeriodEndMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "trialEndsAtMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "cancelAtPeriodEnd": {
      "type": "boolean",
      "x-catch-ownership": "server-only"
    },
    "pause": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "initiator",
            "pausedAtMillis"
          ],
          "properties": {
            "initiator": {
              "enum": [
                "member",
                "host"
              ]
            },
            "pausedAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        }
      ],
      "x-catch-ownership": "server-only"
    },
    "pastDueSinceMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "memberSinceMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "tenure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "accumulatedMillis",
        "stretchStartedAtMillis"
      ],
      "properties": {
        "accumulatedMillis": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "stretchStartedAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
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
    "providerPlanId": {
      "type": "string",
      "pattern": "^plan_[A-Za-z0-9]{6,40}$",
      "x-catch-ownership": "server-only"
    },
    "providerEventAtMillis": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "lastCheckoutId": {
      "type": "string",
      "pattern": "^hmc_[A-Za-z0-9]{20}$",
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
