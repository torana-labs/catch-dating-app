/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetSupportConversationCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_support_conversation_payload.schema.json",
  "title": "AdminGetSupportConversationCallablePayload",
  "description": "Opens one support conversation with its messages, the full contact address and its links. Audited.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "conversationId"
  ],
  "properties": {
    "conversationId": {
      "type": "string",
      "pattern": "^(whatsapp|instagram|email)-[a-f0-9]{64}$"
    }
  },
  "x-callable-aliases": [
    "adminGetSupportConversation"
  ]
} as const;
