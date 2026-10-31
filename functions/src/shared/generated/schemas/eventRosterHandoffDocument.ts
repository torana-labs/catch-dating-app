/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventRosterHandoffDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_roster_handoffs.schema.json",
  "title": "EventRosterHandoffDocument",
  "description": "Server-only, expiring capability that routes a verified forwarded roster to one event and Host identity.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventRosterHandoffs",
  "x-firestore-path": "eventRosterHandoffs/{tokenHash}",
  "x-document-id-field": "id",
  "x-owner": "createEventRosterHandoff and ingestEventRosterWebhook",
  "required": [
    "eventId",
    "organizerId",
    "hostUid",
    "tokenHash",
    "provider",
    "status",
    "createdAt",
    "updatedAt",
    "expiresAt"
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
    "hostUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "tokenHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "provider": {
      "type": "string",
      "enum": [
        "generic",
        "luma",
        "eventbrite",
        "partiful",
        "posh",
        "bookmyshow",
        "district",
        "sortmyscene",
        "airbnb"
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "expired",
        "revoked"
      ]
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
      }
    }
  }
} as const;
