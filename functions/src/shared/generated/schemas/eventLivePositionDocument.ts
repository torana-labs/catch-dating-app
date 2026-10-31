/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventLivePositionDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_live_positions.schema.json",
  "title": "EventLivePositionDocument",
  "description": "Server-owned, short-lived Host or operator position for one moving event. Attendee positions are never collected.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventLivePositions",
  "x-firestore-path": "eventLivePositions/{positionId}",
  "x-document-id-field": "id",
  "x-owner": "event live-position callable",
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "role",
    "latitude",
    "longitude",
    "accuracyMeters",
    "headingDegrees",
    "recordedAt",
    "expiresAt",
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
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "role": {
      "type": "string",
      "enum": [
        "host",
        "operator"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "latitude": {
      "type": "number",
      "minimum": -90,
      "maximum": 90,
      "x-catch-ownership": "callable-owned"
    },
    "longitude": {
      "type": "number",
      "minimum": -180,
      "maximum": 180,
      "x-catch-ownership": "callable-owned"
    },
    "accuracyMeters": {
      "type": [
        "number",
        "null"
      ],
      "minimum": 0,
      "maximum": 10000,
      "x-catch-ownership": "callable-owned"
    },
    "headingDegrees": {
      "type": [
        "number",
        "null"
      ],
      "minimum": 0,
      "exclusiveMaximum": 360,
      "x-catch-ownership": "callable-owned"
    },
    "recordedAt": {
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
    "expiresAt": {
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
