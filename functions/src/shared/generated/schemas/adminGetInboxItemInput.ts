/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetInboxItemCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_inbox_item_payload.schema.json",
  "title": "AdminGetInboxItemCallablePayload",
  "description": "One Admin inbox item and every step it took, oldest first.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "itemId"
  ],
  "properties": {
    "itemId": {
      "type": "string",
      "minLength": 3,
      "maxLength": 220,
      "pattern": "^[a-z]+-[A-Za-z0-9._:-]+$"
    }
  },
  "x-callable-aliases": [
    "adminGetInboxItem"
  ]
} as const;
