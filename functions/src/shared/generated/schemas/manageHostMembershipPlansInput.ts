/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipPlansCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_host_membership_plans_payload.schema.json",
  "title": "ManageHostMembershipPlansCallablePayload",
  "description": "Organizer-manager plan management: list every plan, save a draft or edit, publish (creates provider prices) and archive (stops new joins).",
  "x-owner": "Host memberships plan editor",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "organizerId"
      ],
      "properties": {
        "action": {
          "const": "list"
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "organizerId",
        "planId",
        "plan",
        "expectedRevision"
      ],
      "properties": {
        "action": {
          "const": "save"
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "planId": {
          "oneOf": [
            {
              "type": "null"
            },
            {
              "type": "string",
              "pattern": "^hmp_[A-Za-z0-9]{20}$"
            }
          ]
        },
        "plan": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "name",
            "description",
            "prices",
            "memberCap",
            "trialDays",
            "benefits",
            "perks",
            "limits",
            "sortOrder"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 60
            },
            "description": {
              "type": "string",
              "maxLength": 500
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
                    "amountPaise"
                  ],
                  "properties": {
                    "amountPaise": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 1500000,
                      "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
                    }
                  }
                },
                "annual": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "amountPaise"
                  ],
                  "properties": {
                    "amountPaise": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 1500000,
                      "description": "INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication."
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
            "sortOrder": {
              "type": "integer",
              "minimum": 0,
              "maximum": 1000
            }
          }
        },
        "expectedRevision": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 9007199254740990
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "organizerId",
        "planId"
      ],
      "properties": {
        "action": {
          "const": "publish"
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "planId": {
          "type": "string",
          "pattern": "^hmp_[A-Za-z0-9]{20}$"
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "organizerId",
        "planId"
      ],
      "properties": {
        "action": {
          "const": "archive"
        },
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "planId": {
          "type": "string",
          "pattern": "^hmp_[A-Za-z0-9]{20}$"
        }
      }
    }
  ]
} as const;
