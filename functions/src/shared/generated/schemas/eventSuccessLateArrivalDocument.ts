/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessLateArrivalDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_late_arrivals.schema.json",
  "title": "EventSuccessLateArrivalDocument",
  "description": "Server-owned Host resolution for a checked-in late attendee stored at eventSuccessLateArrivals/{eventId_uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessLateArrivals",
  "x-firestore-path": "eventSuccessLateArrivals/{resolutionId}",
  "x-document-id-field": "id",
  "x-owner": "event-success late-arrival callable",
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "resolvedByUid",
    "status",
    "targetRoundIndex",
    "assignmentDraftRevision",
    "reason",
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
    "resolvedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "insertedIntoOpenPair",
        "extendedUnit",
        "heldForNextRound"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "targetRoundIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "assignmentDraftRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "reason": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
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
