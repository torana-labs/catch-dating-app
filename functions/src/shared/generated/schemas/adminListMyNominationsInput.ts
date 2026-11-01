/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListMyNominationsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_my_nominations_payload.schema.json",
  "title": "AdminListMyNominationsCallablePayload",
  "description": "One page of the organizers the caller nominated, newest first, with what happened to each.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "filter",
    "limit",
    "cursor"
  ],
  "properties": {
    "filter": {
      "type": "string",
      "enum": [
        "all",
        "published",
        "waiting",
        "stuck"
      ]
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "cursor": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000,
          "pattern": "^[A-Za-z0-9_-]+$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-callable-aliases": [
    "adminListMyNominations"
  ]
} as const;
