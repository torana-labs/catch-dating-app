/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessStandingsDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_standings.schema.json",
  "title": "EventSuccessStandingsDocument",
  "description": "Server-owned attendee-readable standings snapshots stored at eventSuccessStandings/{eventId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessStandings",
  "x-firestore-path": "eventSuccessStandings/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "recordEventSuccessUnitOutcomes callable",
  "required": [
    "eventId",
    "organizerId",
    "unitOutcome",
    "revision",
    "latestRoundIndex",
    "rounds",
    "entries",
    "createdAt",
    "updatedAt"
  ],
  "definitions": {
    "standingEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unitId",
        "unitLabel",
        "position",
        "value",
        "roundsRecorded"
      ],
      "properties": {
        "unitId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
        },
        "unitLabel": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "position": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200
        },
        "value": {
          "type": "number",
          "minimum": -100000000,
          "maximum": 100000000
        },
        "roundsRecorded": {
          "type": "integer",
          "minimum": 1,
          "maximum": 101
        }
      }
    }
  },
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "unitOutcome": {
      "type": "string",
      "enum": [
        "score",
        "rank"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "revision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "latestRoundIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "rounds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 101,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "roundIndex",
          "entries"
        ],
        "properties": {
          "roundIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "entries": {
            "type": "array",
            "minItems": 1,
            "maxItems": 200,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "unitId",
                "unitLabel",
                "position",
                "value",
                "roundsRecorded"
              ],
              "properties": {
                "unitId": {
                  "type": "string",
                  "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
                },
                "unitLabel": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 80
                },
                "position": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 200
                },
                "value": {
                  "type": "number",
                  "minimum": -100000000,
                  "maximum": 100000000
                },
                "roundsRecorded": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 101
                }
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "entries": {
      "type": "array",
      "minItems": 1,
      "maxItems": 200,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "unitId",
          "unitLabel",
          "position",
          "value",
          "roundsRecorded"
        ],
        "properties": {
          "unitId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
          },
          "unitLabel": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "position": {
            "type": "integer",
            "minimum": 1,
            "maximum": 200
          },
          "value": {
            "type": "number",
            "minimum": -100000000,
            "maximum": 100000000
          },
          "roundsRecorded": {
            "type": "integer",
            "minimum": 1,
            "maximum": 101
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "createdAt": {
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
      },
      "x-catch-ownership": "callable-owned"
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
      },
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
