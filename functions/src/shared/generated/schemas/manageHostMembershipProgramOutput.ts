/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipProgramCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_host_membership_program_response.schema.json",
  "title": "ManageHostMembershipProgramCallableResponse",
  "description": "Bounded program projection plus readiness facts the host settings screen needs before enabling memberships. routeAccountReady means the payment account the effective money flow needs is ready (a connected Razorpay account for hostCollected, the Route linked account for platformSplit); feeConfigured means Catch's commercial terms resolve. unavailableReason names the first blocker.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "program",
    "routeAccountReady",
    "feeConfigured"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "program": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "state",
            "provider",
            "mode",
            "billingPauseState",
            "memberCount",
            "revision"
          ],
          "properties": {
            "state": {
              "enum": [
                "enabled",
                "disabled"
              ]
            },
            "provider": {
              "enum": [
                "razorpay"
              ]
            },
            "mode": {
              "enum": [
                "test",
                "live"
              ]
            },
            "billingPauseState": {
              "enum": [
                "active",
                "pausing",
                "paused",
                "resuming"
              ]
            },
            "memberCount": {
              "type": "integer",
              "minimum": 0,
              "maximum": 10000000
            },
            "revision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740990
            }
          }
        }
      ]
    },
    "routeAccountReady": {
      "type": "boolean"
    },
    "feeConfigured": {
      "type": "boolean"
    },
    "paymentMode": {
      "description": "The organizer's effective membership money flow, or null when Catch has not offered memberships to this organizer.",
      "anyOf": [
        {
          "description": "hostCollected: the guest pays the organizer's own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch's platform account collects and transfers the organizer's share (Razorpay Route), deducting any at-source fee.",
          "enum": [
            "hostCollected",
            "platformSplit"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "unavailableReason": {
      "anyOf": [
        {
          "enum": [
            "notOffered",
            "termsNotConfigured",
            "razorpayNotConnected",
            "razorpayNeedsAttention",
            "subscriptionsNotEnabled",
            "payoutAccountNotReady",
            "providerUnavailable"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
