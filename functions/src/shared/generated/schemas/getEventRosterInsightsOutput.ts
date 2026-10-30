/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const getEventRosterInsightsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/get_event_roster_insights_response.schema.json",
  "title": "GetEventRosterInsightsCallableResponse",
  "description": "Manager-only, event-relative attendance and Catch-payment labels for an operational roster. Private Event Success, dating, feedback, and safety data are excluded.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "eventId",
    "organizerId",
    "cutoffAtMillis",
    "sourceCoverage",
    "spendCoverage",
    "rows",
    "computedAtMillis"
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
    "cutoffAtMillis": {
      "type": "integer",
      "minimum": 0
    },
    "sourceCoverage": {
      "type": "string",
      "enum": [
        "exact",
        "partial"
      ]
    },
    "spendCoverage": {
      "type": "string",
      "enum": [
        "catchPaymentsOnly",
        "insufficientData"
      ]
    },
    "rows": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "attendeeId",
          "contactId",
          "availability",
          "signals",
          "priorAttendedEventCount",
          "priorExpectedEventCount",
          "priorNoShowCount",
          "lastAttendedAtMillis",
          "attendanceRate",
          "catchSpend"
        ],
        "properties": {
          "attendeeId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "contactId": {
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
          "availability": {
            "type": "string",
            "enum": [
              "ready",
              "projectionPending",
              "ambiguousIdentity",
              "insufficientHistory"
            ]
          },
          "signals": {
            "type": "array",
            "uniqueItems": true,
            "maxItems": 11,
            "items": {
              "type": "string",
              "enum": [
                "first_time",
                "returning",
                "regular",
                "re_engaging",
                "reliable",
                "needs_confirmation",
                "advocate",
                "high_impact_advocate",
                "known_catch_spender",
                "top_catch_spender",
                "member"
              ]
            }
          },
          "priorAttendedEventCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000
          },
          "priorExpectedEventCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000
          },
          "priorNoShowCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000
          },
          "lastAttendedAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "attendanceRate": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1
          },
          "catchSpend": {
            "type": "array",
            "maxItems": 12,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "currency",
                "amountMinor",
                "paidOrderCount"
              ],
              "properties": {
                "currency": {
                  "type": "string",
                  "pattern": "^[A-Z]{3}$"
                },
                "amountMinor": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 9007199254740991
                },
                "paidOrderCount": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 1000000
                }
              }
            }
          }
        }
      }
    },
    "computedAtMillis": {
      "type": "integer",
      "minimum": 0
    }
  },
  "definitions": {
    "signal": {
      "type": "string",
      "enum": [
        "first_time",
        "returning",
        "regular",
        "re_engaging",
        "reliable",
        "needs_confirmation",
        "advocate",
        "high_impact_advocate",
        "known_catch_spender",
        "top_catch_spender",
        "member"
      ]
    },
    "spendAmount": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "currency",
        "amountMinor",
        "paidOrderCount"
      ],
      "properties": {
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "amountMinor": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "paidOrderCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        }
      }
    },
    "row": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "attendeeId",
        "contactId",
        "availability",
        "signals",
        "priorAttendedEventCount",
        "priorExpectedEventCount",
        "priorNoShowCount",
        "lastAttendedAtMillis",
        "attendanceRate",
        "catchSpend"
      ],
      "properties": {
        "attendeeId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "contactId": {
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
        "availability": {
          "type": "string",
          "enum": [
            "ready",
            "projectionPending",
            "ambiguousIdentity",
            "insufficientHistory"
          ]
        },
        "signals": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 11,
          "items": {
            "type": "string",
            "enum": [
              "first_time",
              "returning",
              "regular",
              "re_engaging",
              "reliable",
              "needs_confirmation",
              "advocate",
              "high_impact_advocate",
              "known_catch_spender",
              "top_catch_spender",
              "member"
            ]
          }
        },
        "priorAttendedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "priorExpectedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "priorNoShowCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "lastAttendedAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "attendanceRate": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0,
          "maximum": 1
        },
        "catchSpend": {
          "type": "array",
          "maxItems": 12,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "currency",
              "amountMinor",
              "paidOrderCount"
            ],
            "properties": {
              "currency": {
                "type": "string",
                "pattern": "^[A-Z]{3}$"
              },
              "amountMinor": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "paidOrderCount": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              }
            }
          }
        }
      }
    }
  }
} as const;
