/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const moderationFlagDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/moderation_flags.schema.json",
  "title": "ModerationFlagDocument",
  "description": "Canonical moderation ticket stored at moderationFlags/{flagId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "moderationFlags",
  "x-firestore-path": "moderationFlags/{flagId}",
  "x-document-id-field": "id",
  "x-owner": "moderation triggers",
  "required": [
    "targetUserId",
    "flagType",
    "source",
    "status",
    "createdAt"
  ],
  "properties": {
    "targetUserId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "trigger-owned"
    },
    "flagType": {
      "type": "string",
      "enum": [
        "explicit_photo",
        "banned_text",
        "underage_content"
      ],
      "x-catch-ownership": "trigger-owned"
    },
    "source": {
      "type": "string",
      "enum": [
        "profile_photo",
        "organizer_image",
        "chat_message",
        "user_bio",
        "organizer_description",
        "review_comment"
      ],
      "x-catch-ownership": "trigger-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "reviewed",
        "dismissed"
      ],
      "x-catch-ownership": "trigger-owned"
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
      "x-catch-ownership": "trigger-owned"
    },
    "reviewedAt": {
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
      "x-catch-ownership": "trigger-owned"
    },
    "contextId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "trigger-owned"
    },
    "context": {
      "type": "string",
      "maxLength": 1000,
      "x-catch-ownership": "trigger-owned"
    },
    "safeSearchResults": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      },
      "x-catch-ownership": "trigger-owned"
    }
  }
} as const;
