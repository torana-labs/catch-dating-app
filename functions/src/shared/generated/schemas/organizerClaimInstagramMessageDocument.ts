/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerClaimInstagramMessageDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_claim_instagram_messages.schema.json",
  "title": "OrganizerClaimInstagramMessageDocument",
  "description": "Server-only receipt for one Instagram direct message the claim webhook handled, stored at organizerClaimInstagramMessages/{messageKey}. Meta retries deliveries, so the receipt makes each message count once. It keeps no message text or sender id. Firestore TTL deletes it after expiresAt.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerClaimInstagramMessages",
  "x-firestore-path": "organizerClaimInstagramMessages/{messageKey}",
  "x-document-id-field": "messageKey",
  "x-owner": "instagramClaimWebhook",
  "required": [
    "messageKey",
    "outcome",
    "attemptId",
    "receivedAt",
    "expiresAt"
  ],
  "properties": {
    "messageKey": {
      "description": "SHA-256 of the Instagram message id.",
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "server-only"
    },
    "outcome": {
      "type": "string",
      "enum": [
        "verified",
        "wrongSender",
        "expiredCode",
        "codeAlreadyUsed",
        "unknownCode",
        "claimUnavailable",
        "senderUnknown",
        "rateLimited"
      ],
      "x-catch-ownership": "server-only"
    },
    "attemptId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "server-only"
    },
    "receivedAt": {
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
      "x-catch-ownership": "server-only"
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
      "x-catch-ownership": "server-only"
    }
  }
} as const;
