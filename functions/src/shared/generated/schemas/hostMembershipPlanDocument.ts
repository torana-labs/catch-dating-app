/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipPlanDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_plans.schema.json",
  "title": "HostMembershipPlanDocument",
  "description": "One paid membership tier sold by an organizer. Published plans are readable by signed-in users; only the plans callable writes them. Price changes create a new provider price and leave existing members on the price they bought.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipPlans",
  "x-firestore-path": "hostMembershipPlans/{planId}",
  "x-document-id-field": "planId",
  "x-owner": "manageHostMembershipPlans callable; member counts by the membership state machine",
  "required": [
    "schemaVersion",
    "organizerId",
    "name",
    "description",
    "status",
    "prices",
    "memberCap",
    "trialDays",
    "benefits",
    "perks",
    "limits",
    "activeMemberCount",
    "sortOrder",
    "revision",
    "createdAtMillis",
    "updatedAtMillis",
    "publishedAtMillis"
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
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60,
      "x-catch-ownership": "callable-owned"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "enum": [
        "draft",
        "published",
        "archived"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "prices": {
      "type": "object",
      "additionalProperties": false,
      "minProperties": 1,
      "properties": {
        "monthly": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "amountPaise",
            "providerPriceIds",
            "revision"
          ],
          "properties": {
            "amountPaise": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 1500000,
              "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
            },
            "providerPriceIds": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "razorpay": {
                  "type": "string",
                  "pattern": "^plan_[A-Za-z0-9]{6,40}$"
                }
              }
            },
            "revision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740990
            }
          }
        },
        "annual": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "amountPaise",
            "providerPriceIds",
            "revision"
          ],
          "properties": {
            "amountPaise": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 1500000,
              "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
            },
            "providerPriceIds": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "razorpay": {
                  "type": "string",
                  "pattern": "^plan_[A-Za-z0-9]{6,40}$"
                }
              }
            },
            "revision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740990
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "memberCap": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 1,
      "maximum": 100000,
      "x-catch-ownership": "callable-owned"
    },
    "trialDays": {
      "type": "integer",
      "minimum": 0,
      "maximum": 30,
      "x-catch-ownership": "callable-owned"
    },
    "benefits": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "percentOff"
            ],
            "properties": {
              "type": {
                "const": "eventDiscount"
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
              "type"
            ],
            "properties": {
              "type": {
                "const": "earlyAccess"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type"
            ],
            "properties": {
              "type": {
                "const": "membersOnlyAccess"
              }
            }
          }
        ]
      },
      "x-catch-ownership": "callable-owned"
    },
    "perks": {
      "type": "array",
      "maxItems": 8,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "x-catch-ownership": "callable-owned"
    },
    "limits": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "maxUpcomingMemberPricedBookings"
      ],
      "properties": {
        "maxUpcomingMemberPricedBookings": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 20
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "activeMemberCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000000,
      "x-catch-ownership": "server-only"
    },
    "sortOrder": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000,
      "x-catch-ownership": "callable-owned"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740990,
      "x-catch-ownership": "callable-owned"
    },
    "createdAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "updatedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "publishedAtMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
