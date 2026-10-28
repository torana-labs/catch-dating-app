/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerClaimInstagramCodeDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_claim_instagram_codes.schema.json",
  "title": "OrganizerClaimInstagramCodeDocument",
  "description": "Server-only reservation of a live Instagram claim code, stored at organizerClaimInstagramCodes/{code}. Keying by the code keeps live codes unique and lets the webhook find the attempt without a query. Firestore TTL deletes it after expiresAt.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerClaimInstagramCodes",
  "x-firestore-path": "organizerClaimInstagramCodes/{code}",
  "x-document-id-field": "code",
  "x-owner": "startOrganizerClaimVerification callable and instagramClaimWebhook",
  "required": [
    "code",
    "attemptId",
    "organizerId",
    "expiresAt",
    "consumedAt"
  ],
  "properties": {
    "code": {
      "type": "string",
      "pattern": "^[0-9]{6}$",
      "x-catch-ownership": "server-only"
    },
    "attemptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
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
    },
    "consumedAt": {
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
      ],
      "description": "Set when the code verified a claim or its attempt was superseded. A consumed code stays reserved until expiresAt, so a replay gets a clear answer.",
      "x-catch-ownership": "server-only"
    }
  }
} as const;
