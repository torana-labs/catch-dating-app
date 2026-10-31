/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessArrivalMissionDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_arrival_missions.schema.json",
  "title": "EventSuccessArrivalMissionDocument",
  "description": "Server-owned First Hello arrival mission stored at eventSuccessArrivalMissions/{eventId_uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessArrivalMissions",
  "x-firestore-path": "eventSuccessArrivalMissions/{missionId}",
  "x-document-id-field": "id",
  "x-owner": "server-owned; attendee read only for their own mission",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "eventId",
    "organizerId",
    "observerUid",
    "targetUid",
    "targetDisplayName",
    "targetContext",
    "question",
    "answerOptions",
    "venueSessionId",
    "venueSessionRedemptionId",
    "status",
    "createdAt",
    "updatedAt"
  ],
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
    "observerUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "targetUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "targetDisplayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "x-catch-ownership": "callable-owned"
    },
    "targetContext": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160,
      "x-catch-ownership": "callable-owned"
    },
    "question": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160,
      "x-catch-ownership": "callable-owned"
    },
    "answerOptions": {
      "type": "array",
      "minItems": 2,
      "maxItems": 4,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "label"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "venueSessionId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{24,80}$",
      "x-catch-ownership": "callable-owned"
    },
    "venueSessionRedemptionId": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "completed",
        "skipped"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "selectedAnswerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 64,
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
    },
    "completedAt": {
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
    "synthetic": {
      "type": "boolean",
      "description": "Internal demo seed marker used for cleanup and diagnostics."
    },
    "seedPrefix": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed prefix used for cleanup and diagnostics."
    },
    "scenario": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed scenario name used for cleanup and diagnostics."
    },
    "demoOps": {
      "type": "boolean",
      "description": "Internal demo-operations marker used for cleanup and diagnostics."
    },
    "demoOpsId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "description": "Internal demo-operations id used for cleanup and diagnostics."
    },
    "demoOpsCommand": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "description": "Internal demo-operations command name used for cleanup and diagnostics."
    }
  }
} as const;
