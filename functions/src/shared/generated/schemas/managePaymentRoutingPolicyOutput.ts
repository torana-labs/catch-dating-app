/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const managePaymentRoutingPolicyCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_payment_routing_policy_response.schema.json",
  "title": "ManagePaymentRoutingPolicyCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "policyId",
    "organizerId",
    "revision",
    "formFee",
    "eventAdmission",
    "hostMembership",
    "updatedAtMillis"
  ],
  "properties": {
    "policyId": {
      "type": "string",
      "pattern": "^(app|org_[a-f0-9]{64})$"
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
    "revision": {
      "type": "integer",
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
    "updatedAtMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    }
  }
} as const;
