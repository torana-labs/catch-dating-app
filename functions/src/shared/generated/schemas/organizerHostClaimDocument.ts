/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerHostClaimDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/club_host_claims.schema.json",
  "title": "OrganizerHostClaimDocument",
  "description": "Server-owned singleton claim stored at organizerHostClaims/{uid} to enforce one hosted club per user.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerHostClaims",
  "x-firestore-path": "organizerHostClaims/{uid}",
  "x-document-id-field": "uid",
  "x-owner": "createOrganizer callable",
  "required": [
    "uid",
    "organizerId",
    "createdAt"
  ],
  "properties": {
    "uid": {
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
      "x-catch-ownership": "server-only"
    }
  }
} as const;
