/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminUpsertSupportSavedReplyCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_upsert_support_saved_reply_payload.schema.json",
  "title": "AdminUpsertSupportSavedReplyCallablePayload",
  "description": "Adds or edits a saved reply; switch one off with active false.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "replyId",
    "title",
    "body",
    "active"
  ],
  "properties": {
    "replyId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9_-]{8,128}$"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "body": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    },
    "active": {
      "type": "boolean"
    }
  },
  "x-callable-aliases": [
    "adminUpsertSupportSavedReply"
  ]
} as const;
