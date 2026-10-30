/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipProgramCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_host_membership_program_response.schema.json",
  "title": "ManageHostMembershipProgramCallableResponse",
  "description": "Bounded program projection plus readiness facts the host settings screen needs before enabling memberships.",
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
    }
  }
} as const;
