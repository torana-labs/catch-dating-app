/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListOrganizerDirectoryCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_organizer_directory_payload.schema.json",
  "title": "AdminListOrganizerDirectoryCallablePayload",
  "description": "Callable payload accepted by adminListOrganizerDirectory, the Admin Organizers directory. view picks one of the directory's views; the other fields narrow it. mine keeps organizers whose Sales account the caller owns. cursor is the opaque nextCursor of the previous page.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner, ops and support, sales associates)",
  "properties": {
    "view": {
      "type": "string",
      "enum": [
        "all",
        "live",
        "unclaimed",
        "hidden"
      ]
    },
    "query": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 160
    },
    "citySlug": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
        },
        {
          "type": "null"
        }
      ]
    },
    "kind": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-z0-9-]{1,80}$"
    },
    "claimState": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "unclaimed",
        "claimPending",
        "claimed",
        null
      ]
    },
    "mine": {
      "type": "boolean"
    },
    "cursor": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^o:[0-9]{1,5}$"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  }
} as const;
