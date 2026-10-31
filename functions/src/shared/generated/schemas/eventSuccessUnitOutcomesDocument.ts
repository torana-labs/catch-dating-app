/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessUnitOutcomesDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_unit_outcomes.schema.json",
  "title": "EventSuccessUnitOutcomesDocument",
  "description": "Server-owned outcome rounds stored at eventSuccessUnitOutcomes/{eventId}. Hosts may read the source; attendees consume the standings projection.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessUnitOutcomes",
  "x-firestore-path": "eventSuccessUnitOutcomes/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "recordEventSuccessUnitOutcomes callable",
  "required": [
    "eventId",
    "organizerId",
    "unitOutcome",
    "revision",
    "rounds",
    "createdAt",
    "updatedAt"
  ],
  "definitions": {
    "unitIdentity": {
      "unitId": {
        "type": "string",
        "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
      },
      "unitLabel": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      }
    },
    "outcomeEntry": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "unitId",
            "unitLabel",
            "completed"
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
            "completed": {
              "type": "boolean"
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "unitId",
            "unitLabel",
            "score"
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
            "score": {
              "type": "number",
              "minimum": -1000000,
              "maximum": 1000000
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "unitId",
            "unitLabel",
            "rank"
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
            "rank": {
              "type": "integer",
              "minimum": 1,
              "maximum": 200
            }
          }
        }
      ]
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
        "completion",
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
    "rounds": {
      "type": "array",
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
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "unitId",
                    "unitLabel",
                    "completed"
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
                    "completed": {
                      "type": "boolean"
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "unitId",
                    "unitLabel",
                    "score"
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
                    "score": {
                      "type": "number",
                      "minimum": -1000000,
                      "maximum": 1000000
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "unitId",
                    "unitLabel",
                    "rank"
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
                    "rank": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 200
                    }
                  }
                }
              ]
            }
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
