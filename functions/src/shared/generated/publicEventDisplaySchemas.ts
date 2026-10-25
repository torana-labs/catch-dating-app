/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
export const publicEventDisplaySchemas = {
  "photoUrl": {
    "anyOf": [
      {
        "type": "string",
        "format": "uri",
        "maxLength": 2048
      },
      {
        "type": "null"
      }
    ],
    "x-catch-ownership": "callable-owned"
  },
  "meetingLocation": {
    "type": "object",
    "additionalProperties": false,
    "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
    "required": [
      "name",
      "latitude",
      "longitude"
    ],
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "address": {
        "type": [
          "string",
          "null"
        ],
        "maxLength": 500
      },
      "placeId": {
        "type": [
          "string",
          "null"
        ],
        "minLength": 1,
        "maxLength": 256
      },
      "latitude": {
        "type": "number",
        "minimum": -90,
        "maximum": 90
      },
      "longitude": {
        "type": "number",
        "minimum": -180,
        "maximum": 180
      },
      "notes": {
        "type": [
          "string",
          "null"
        ],
        "maxLength": 1000
      }
    }
  },
  "itinerary": {
    "type": "array",
    "maxItems": 40,
    "items": {
      "type": "object",
      "additionalProperties": false,
      "description": "One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.",
      "required": [
        "id",
        "kind",
        "offsetMinutes",
        "title"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "pattern": "^[A-Za-z0-9_-]+$"
        },
        "kind": {
          "type": "string",
          "enum": [
            "gather",
            "activity",
            "stop",
            "break",
            "transition",
            "finish"
          ]
        },
        "offsetMinutes": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1440
        },
        "durationMinutes": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 1440
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "description": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 500
        },
        "location": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
              "required": [
                "name",
                "latitude",
                "longitude"
              ],
              "properties": {
                "name": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 240
                },
                "address": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 500
                },
                "placeId": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "minLength": 1,
                  "maxLength": 256
                },
                "latitude": {
                  "type": "number",
                  "minimum": -90,
                  "maximum": 90
                },
                "longitude": {
                  "type": "number",
                  "minimum": -180,
                  "maximum": 180
                },
                "notes": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 1000
                }
              }
            },
            {
              "type": "null"
            }
          ]
        },
        "routeDistanceMeters": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 1000000
        }
      }
    },
    "x-catch-ownership": "callable-owned"
  }
} as const;
