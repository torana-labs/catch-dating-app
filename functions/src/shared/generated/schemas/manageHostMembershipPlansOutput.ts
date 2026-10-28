/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipPlansCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_host_membership_plans_response.schema.json",
  "title": "ManageHostMembershipPlansCallableResponse",
  "description": "Every plan of one organizer in sort order, after the requested action. Provider price ids are never returned.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "plans"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "plans": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "planId",
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
          "publishedAtMillis"
        ],
        "properties": {
          "planId": {
            "type": "string",
            "pattern": "^hmp_[A-Za-z0-9]{20}$"
          },
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 60
          },
          "description": {
            "type": "string",
            "maxLength": 500
          },
          "status": {
            "enum": [
              "draft",
              "published",
              "archived"
            ]
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
                  "revision"
                ],
                "properties": {
                  "amountPaise": {
                    "type": "integer",
                    "minimum": 1000,
                    "maximum": 1500000,
                    "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
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
                  "revision"
                ],
                "properties": {
                  "amountPaise": {
                    "type": "integer",
                    "minimum": 1000,
                    "maximum": 1500000,
                    "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
                  },
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740990
                  }
                }
              }
            }
          },
          "memberCap": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 1,
            "maximum": 100000
          },
          "trialDays": {
            "type": "integer",
            "minimum": 0,
            "maximum": 30
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
            }
          },
          "perks": {
            "type": "array",
            "maxItems": 8,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            }
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
            }
          },
          "activeMemberCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 10000000
          },
          "sortOrder": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740990
          },
          "publishedAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 9007199254740991
          }
        }
      }
    }
  }
} as const;
