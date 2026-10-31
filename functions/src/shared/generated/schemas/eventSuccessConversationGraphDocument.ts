/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessConversationGraphDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_conversation_graphs.schema.json",
  "title": "EventSuccessConversationGraphDocument",
  "description": "Attendee-private end-of-event conversation edges stored at eventSuccessConversationGraphs/{eventId_uid}. Hosts consume aggregate scorecard counts only.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessConversationGraphs",
  "x-firestore-path": "eventSuccessConversationGraphs/{graphId}",
  "x-document-id-field": "id",
  "x-owner": "subject attendee read; conversation graph callable write",
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "status",
    "selectedUids",
    "assignedSelectedCount",
    "assignedCandidateCount",
    "consentMode",
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
    "status": {
      "type": "string",
      "enum": [
        "submitted",
        "skipped"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "selectedUids": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 1000,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      },
      "x-catch-ownership": "callable-owned"
    },
    "assignedSelectedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000,
      "x-catch-ownership": "callable-owned"
    },
    "assignedCandidateCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000,
      "x-catch-ownership": "callable-owned"
    },
    "consentMode": {
      "type": "string",
      "enum": [
        "optIn",
        "optOut"
      ],
      "description": "Snapshot of the event plan mode shown for this response.",
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
