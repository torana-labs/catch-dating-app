/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageEventMembershipRulesCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_event_membership_rules_payload.schema.json",
  "title": "ManageEventMembershipRulesCallablePayload",
  "description": "Organizer-manager read and edit of one event's paid-membership rules: member price overrides, early-access hours and the members-only flag.",
  "x-owner": "Host event editor membership rules section",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "action",
        "eventId"
      ],
      "properties": {
        "action": {
          "enum": [
            "get",
            "clear"
          ]
        },
        "eventId": {
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
        "eventId",
        "memberPriceOverrides",
        "earlyAccessHours",
        "membersOnly",
        "expectedRevision"
      ],
      "properties": {
        "action": {
          "const": "save"
        },
        "eventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
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
        "membersOnly": {
          "type": "boolean"
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
    }
  ]
} as const;
