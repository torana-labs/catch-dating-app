/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const managePaymentRoutingPolicyCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_payment_routing_policy_payload.schema.json",
  "title": "ManagePaymentRoutingPolicyCallablePayload",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "action",
    "organizerId",
    "expectedRevision",
    "formFee",
    "eventAdmission"
  ],
  "properties": {
    "action": {
      "enum": [
        "read",
        "replace"
      ]
    },
    "organizerId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedRevision": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "formFee": {
      "anyOf": [
        {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route"
              ],
              "properties": {
                "route": {
                  "const": "disabled"
                }
              }
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route",
                "mode",
                "currency",
                "merchantCountry"
              ],
              "properties": {
                "route": {
                  "enum": [
                    "razorpayRoute",
                    "razorpayOAuth",
                    "stripeConnectDirect",
                    "stripeConnectDestination"
                  ]
                },
                "mode": {
                  "enum": [
                    "test",
                    "live"
                  ]
                },
                "currency": {
                  "type": "string",
                  "pattern": "^[A-Z]{3}$"
                },
                "merchantCountry": {
                  "type": "string",
                  "pattern": "^[A-Z]{2}$"
                }
              }
            }
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "eventAdmission": {
      "anyOf": [
        {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route"
              ],
              "properties": {
                "route": {
                  "const": "disabled"
                }
              }
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route",
                "mode",
                "currency",
                "merchantCountry"
              ],
              "properties": {
                "route": {
                  "enum": [
                    "razorpayRoute",
                    "razorpayOAuth",
                    "stripeConnectDirect",
                    "stripeConnectDestination"
                  ]
                },
                "mode": {
                  "enum": [
                    "test",
                    "live"
                  ]
                },
                "currency": {
                  "type": "string",
                  "pattern": "^[A-Z]{3}$"
                },
                "merchantCountry": {
                  "type": "string",
                  "pattern": "^[A-Z]{2}$"
                }
              }
            }
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "hostMembership": {
      "description": "Optional so older operator clients keep working: an omitted value keeps the stored membership route.",
      "anyOf": [
        {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route"
              ],
              "properties": {
                "route": {
                  "const": "disabled"
                }
              }
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "route",
                "mode",
                "currency",
                "merchantCountry"
              ],
              "properties": {
                "route": {
                  "enum": [
                    "razorpayRoute",
                    "razorpayOAuth",
                    "stripeConnectDirect",
                    "stripeConnectDestination"
                  ]
                },
                "mode": {
                  "enum": [
                    "test",
                    "live"
                  ]
                },
                "currency": {
                  "type": "string",
                  "pattern": "^[A-Z]{3}$"
                },
                "merchantCountry": {
                  "type": "string",
                  "pattern": "^[A-Z]{2}$"
                }
              }
            }
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
