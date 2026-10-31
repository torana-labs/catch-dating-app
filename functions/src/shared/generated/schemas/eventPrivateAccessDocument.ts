/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventPrivateAccessDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_private_access.schema.json",
  "title": "EventPrivateAccessDocument",
  "description": "Host-private access material for invite-only events stored at eventPrivateAccess/{eventId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventPrivateAccess",
  "x-firestore-path": "eventPrivateAccess/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "createEvent callable; readable only by the host of the linked event",
  "required": [
    "eventId",
    "organizerId",
    "inviteCode",
    "createdAt"
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
    "inviteCode": {
      "type": "string",
      "minLength": 4,
      "maxLength": 64,
      "pattern": "^[A-Za-z0-9_-]+$",
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
    }
  }
} as const;
