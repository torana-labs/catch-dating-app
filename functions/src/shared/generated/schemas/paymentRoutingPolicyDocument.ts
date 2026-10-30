/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const paymentRoutingPolicyDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/payment_routing_policies.schema.json",
  "title": "PaymentRoutingPolicyDocument",
  "description": "Operator-owned app defaults and organizer overrides. Null inherits at organizer scope and disables at app scope. An explicit disabled selection never inherits.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "scope",
    "organizerId",
    "revision",
    "formFee",
    "eventAdmission",
    "updatedAt"
  ],
  "properties": {
    "scope": {
      "enum": [
        "app",
        "organizer"
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
    "revision": {
      "type": "integer",
      "minimum": 1
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
      "description": "Membership money flow: razorpayOAuth is hostCollected (subscriptions on the organizer's own connected account), razorpayRoute is platformSplit. Absent on policies written before memberships had a route, and treated as null.",
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
    "updatedAt": {
      "type": "object",
      "description": "Serialized Firestore Timestamp fixture shape.",
      "x-firestore-type": "timestamp",
      "additionalProperties": false,
      "required": [
        "_seconds",
        "_nanoseconds"
      ],
      "properties": {
        "_seconds": {
          "type": "integer"
        },
        "_nanoseconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999999999
        }
      }
    },
    "lastMutationHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "scope": {
            "const": "app"
          }
        }
      },
      "then": {
        "properties": {
          "organizerId": {
            "type": "null"
          }
        }
      },
      "else": {
        "properties": {
          "organizerId": {
            "type": "string"
          }
        }
      }
    }
  ],
  "x-firestore-collection": "paymentRoutingPolicies",
  "x-firestore-path": "paymentRoutingPolicies/{policyId}",
  "x-document-id-field": "policyId",
  "x-owner": "payment routing server operations"
} as const;
