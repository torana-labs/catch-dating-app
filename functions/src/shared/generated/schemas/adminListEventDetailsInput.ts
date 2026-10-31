/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListEventDetailsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_event_details_payload.schema.json",
  "title": "AdminListEventDetailsCallablePayload",
  "description": "Callable payload accepted by adminListEventDetails. This lists canonical events/{eventId} rows for the admin event publishing workspace.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "query": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 160
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
    "citySlug": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
        },
        {
          "type": "null"
        }
      ]
    },
    "citySlugs": {
      "anyOf": [
        {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "minItems": 1,
          "maxItems": 10,
          "uniqueItems": true
        },
        {
          "type": "null"
        }
      ]
    },
    "activityKind": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "socialRun",
        "running",
        "walking",
        "pickleball",
        "padel",
        "tennis",
        "badminton",
        "cycling",
        "spinClass",
        "yoga",
        "strengthTraining",
        "pubQuiz",
        "barCrawl",
        "dinner",
        "singlesMixer",
        "openActivity",
        null
      ]
    },
    "status": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "active",
        "cancelled",
        null
      ]
    },
    "timeWindow": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "upcoming",
        "past",
        "all",
        null
      ],
      "description": "Optional server-side startTime window used by admin event lists. Upcoming and past are evaluated against callable server time."
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  }
} as const;
