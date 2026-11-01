/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetMarketplaceCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_get_marketplace_response.schema.json",
  "title": "AdminGetMarketplaceCallableResponse",
  "description": "The Marketplace from the analytics warehouse's Firestore exports. available is false (with a reason) when the warehouse could not be read; every list is then empty. Rates are whole percentages; null where nothing can be measured (no-shows only count events that checked anyone in).",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "rangeDays",
    "marketId",
    "available",
    "unavailableReason",
    "generatedAtMillis",
    "stats",
    "cities",
    "guestCohorts",
    "bookingsByWeek",
    "goingQuiet"
  ],
  "definitions": {
    "percent": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 100
    },
    "count": {
      "type": "integer",
      "minimum": 0
    }
  },
  "properties": {
    "rangeDays": {
      "enum": [
        7,
        30,
        90
      ]
    },
    "marketId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 50
    },
    "available": {
      "type": "boolean"
    },
    "unavailableReason": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 300
    },
    "generatedAtMillis": {
      "type": "integer",
      "minimum": 1
    },
    "stats": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventsThisWeek",
        "eventsLastWeek",
        "filledPercent",
        "noShowPercent",
        "cameBackPercent"
      ],
      "properties": {
        "eventsThisWeek": {
          "type": "integer",
          "minimum": 0
        },
        "eventsLastWeek": {
          "type": "integer",
          "minimum": 0
        },
        "filledPercent": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 100
        },
        "noShowPercent": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 100
        },
        "cameBackPercent": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 100
        }
      }
    },
    "cities": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "marketId",
          "organizersLive",
          "eventsPerWeek",
          "filledPercent",
          "noShowPercent",
          "waitlisted"
        ],
        "properties": {
          "marketId": {
            "type": "string",
            "maxLength": 50
          },
          "organizersLive": {
            "type": "integer",
            "minimum": 0
          },
          "eventsPerWeek": {
            "type": "number",
            "minimum": 0
          },
          "filledPercent": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          },
          "noShowPercent": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          },
          "waitlisted": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "guestCohorts": {
      "type": "array",
      "maxItems": 24,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "month",
          "guests",
          "again30Percent",
          "again60Percent",
          "again90Percent"
        ],
        "properties": {
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "guests": {
            "type": "integer",
            "minimum": 0
          },
          "again30Percent": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          },
          "again60Percent": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          },
          "again90Percent": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          }
        }
      }
    },
    "bookingsByWeek": {
      "type": "array",
      "maxItems": 13,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "weekStart",
          "bookings",
          "partial"
        ],
        "properties": {
          "weekStart": {
            "type": "string",
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
          },
          "bookings": {
            "type": "integer",
            "minimum": 0
          },
          "partial": {
            "type": "boolean"
          }
        }
      }
    },
    "goingQuiet": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "name",
          "marketId",
          "daysSinceLastEvent",
          "eventsPerMonthBefore",
          "salesOwnerUid",
          "salesOwnerName"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "maxLength": 180
          },
          "name": {
            "type": "string",
            "maxLength": 160
          },
          "marketId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 50
          },
          "daysSinceLastEvent": {
            "type": "integer",
            "minimum": 0
          },
          "eventsPerMonthBefore": {
            "type": "number",
            "minimum": 0
          },
          "salesOwnerUid": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 128
          },
          "salesOwnerName": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 120
          }
        }
      }
    }
  }
} as const;
