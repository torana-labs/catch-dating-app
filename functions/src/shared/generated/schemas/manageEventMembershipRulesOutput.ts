/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageEventMembershipRulesCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_event_membership_rules_response.schema.json",
  "title": "ManageEventMembershipRulesCallableResponse",
  "description": "The event's current membership rules and the organizer's non-archived plans the editor can reference.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "eventId",
    "organizerId",
    "rules",
    "plans"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "rules": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "memberPriceOverrides",
            "earlyAccessHours",
            "generalSaleOpensAtMillis",
            "membersOnly",
            "revision"
          ],
          "properties": {
            "memberPriceOverrides": {
              "type": "array",
              "maxItems": 10,
              "items": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "planId",
                      "percentOff"
                    ],
                    "properties": {
                      "planId": {
                        "type": "string",
                        "pattern": "^hmp_[A-Za-z0-9]{20}$"
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
                      "planId",
                      "priceInPaise"
                    ],
                    "properties": {
                      "planId": {
                        "type": "string",
                        "pattern": "^hmp_[A-Za-z0-9]{20}$"
                      },
                      "priceInPaise": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100000000
                      }
                    }
                  }
                ]
              }
            },
            "earlyAccessHours": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 168
                }
              ]
            },
            "generalSaleOpensAtMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "membersOnly": {
              "type": "boolean"
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
    "plans": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "planId",
          "name",
          "status",
          "benefits"
        ],
        "properties": {
          "planId": {
            "type": "string",
            "pattern": "^hmp_[A-Za-z0-9]{20}$"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 60
          },
          "status": {
            "enum": [
              "draft",
              "published",
              "archived"
            ]
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
          }
        }
      }
    }
  }
} as const;
