/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipCheckoutCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_host_membership_checkout_payload.schema.json",
  "title": "ManageHostMembershipCheckoutCallablePayload",
  "description": "Member checkout: prepare creates a provider subscription and returns its hosted mandate-authorization link; refresh pulls the provider state and applies it.",
  "x-owner": "Consumer membership join flow",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "organizerId",
        "planId",
        "interval"
      ],
      "properties": {
        "action": {
          "const": "prepare"
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "planId": {
          "type": "string",
          "pattern": "^hmp_[A-Za-z0-9]{20}$"
        },
        "interval": {
          "enum": [
            "monthly",
            "annual"
          ]
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "checkoutId"
      ],
      "properties": {
        "action": {
          "const": "refresh"
        },
        "checkoutId": {
          "type": "string",
          "pattern": "^hmc_[A-Za-z0-9]{20}$"
        }
      }
    }
  ]
} as const;
