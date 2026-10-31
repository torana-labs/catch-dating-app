/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminRebuildInboxCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_rebuild_inbox_payload.schema.json",
  "title": "AdminRebuildInboxCallablePayload",
  "description": "Owner-only: re-project one page of an inbox source collection, or of users into the people index.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "source",
    "limit",
    "cursor"
  ],
  "properties": {
    "source": {
      "type": "string",
      "enum": [
        "supplyIntakeRequest",
        "organizerClaimRequest",
        "salesInboundIntent",
        "accessApplication",
        "externalEvent",
        "people"
      ]
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
    },
    "cursor": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 200,
          "pattern": "^[A-Za-z0-9._:-]+$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-callable-aliases": [
    "adminRebuildInbox"
  ]
} as const;
