/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminUpdateInboxItemCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_update_inbox_item_payload.schema.json",
  "title": "AdminUpdateInboxItemCallablePayload",
  "description": "Assign, unassign, snooze or wake one Admin inbox item; audited and recorded in its journey.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "itemId",
    "action",
    "assigneeUid",
    "snoozedUntil",
    "note"
  ],
  "properties": {
    "itemId": {
      "type": "string",
      "minLength": 3,
      "maxLength": 220,
      "pattern": "^[a-z]+-[A-Za-z0-9._:-]+$"
    },
    "action": {
      "type": "string",
      "enum": [
        "assign",
        "unassign",
        "snooze",
        "wake"
      ]
    },
    "assigneeUid": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 128,
          "pattern": "^[A-Za-z0-9_-]+$"
        },
        {
          "type": "null"
        }
      ]
    },
    "snoozedUntil": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ]
    },
    "note": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-callable-aliases": [
    "adminUpdateInboxItem"
  ]
} as const;
