/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventAttendeeImportDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_attendee_imports.schema.json",
  "title": "EventAttendeeImportDocument",
  "description": "Idempotency and audit receipt for one Host operational-roster import.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventAttendeeImports",
  "x-firestore-path": "eventAttendeeImports/{importId}",
  "x-document-id-field": "id",
  "x-owner": "importEventAttendees callable",
  "required": [
    "eventId",
    "organizerId",
    "uploadedBy",
    "importKey",
    "fileName",
    "format",
    "payloadHash",
    "status",
    "rowCount",
    "createdCount",
    "updatedCount",
    "skippedCount",
    "errors",
    "createdAt",
    "updatedAt",
    "completedAt"
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
    "uploadedBy": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "importKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 120
    },
    "fileName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255
    },
    "format": {
      "type": "string",
      "enum": [
        "csv",
        "xlsx",
        "manual"
      ]
    },
    "payloadHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "status": {
      "type": "string",
      "enum": [
        "completed",
        "partial",
        "failed"
      ]
    },
    "rowCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 250
    },
    "createdCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 250
    },
    "updatedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 250
    },
    "skippedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 250
    },
    "errors": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "rowId",
          "code",
          "message"
        ],
        "properties": {
          "rowId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "code": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "message": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          }
        }
      }
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
      }
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
      }
    },
    "completedAt": {
      "anyOf": [
        {
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
          }
        },
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
