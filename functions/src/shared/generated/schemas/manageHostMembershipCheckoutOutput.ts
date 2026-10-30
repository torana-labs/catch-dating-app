/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipCheckoutCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_host_membership_checkout_response.schema.json",
  "title": "ManageHostMembershipCheckoutCallableResponse",
  "description": "Current checkout progress and, once authorized, the resulting membership status.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "checkoutId",
    "state",
    "authorizationUrl",
    "expiresAtMillis",
    "membershipId",
    "membershipStatus"
  ],
  "properties": {
    "checkoutId": {
      "type": "string",
      "pattern": "^hmc_[A-Za-z0-9]{20}$"
    },
    "state": {
      "enum": [
        "creating",
        "open",
        "authorized",
        "expired",
        "failed"
      ]
    },
    "authorizationUrl": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500,
      "pattern": "^https://"
    },
    "expiresAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "membershipId": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string",
          "pattern": "^hm_[a-f0-9]{64}$"
        }
      ]
    },
    "membershipStatus": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "enum": [
            "trialing",
            "active",
            "past_due",
            "paused",
            "canceling",
            "expired"
          ]
        }
      ]
    }
  }
} as const;
