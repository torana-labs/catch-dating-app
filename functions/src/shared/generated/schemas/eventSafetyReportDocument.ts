/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSafetyReportDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_safety_reports.schema.json",
  "title": "EventSafetyReportDocument",
  "description": "Catch-private safety review item materialized from event feedback concerns.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSafetyReports",
  "x-firestore-path": "eventSafetyReports/{reportId}",
  "x-document-id-field": "id",
  "x-owner": "onEventSuccessFeedbackWritten trigger",
  "required": [
    "eventId",
    "organizerId",
    "reporterUserId",
    "feedbackId",
    "source",
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
    "reporterUserId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "feedbackId": {
      "type": "string",
      "minLength": 3,
      "maxLength": 256,
      "x-catch-ownership": "callable-owned"
    },
    "source": {
      "type": "string",
      "enum": [
        "event_success_feedback"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "reviewed",
        "dismissed"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "note": {
      "type": "string",
      "maxLength": 500,
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
