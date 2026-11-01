/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListSupportConversationsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_support_conversations_payload.schema.json",
  "title": "AdminListSupportConversationsCallablePayload",
  "description": "Lists support conversations for the Support inbox: open, mine, waiting on them, or closed, optionally only guests or organizers. Open lists the longest-waiting first.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "view",
    "audience",
    "limit"
  ],
  "properties": {
    "view": {
      "type": "string",
      "enum": [
        "open",
        "mine",
        "waitingOnThem",
        "closed"
      ]
    },
    "audience": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "guest",
        "organizer",
        null
      ]
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
    }
  },
  "x-callable-aliases": [
    "adminListSupportConversations"
  ]
} as const;
