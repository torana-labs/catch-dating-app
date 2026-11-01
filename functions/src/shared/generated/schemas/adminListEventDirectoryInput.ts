/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListEventDirectoryCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_event_directory_payload.schema.json",
  "title": "AdminListEventDirectoryCallablePayload",
  "description": "Callable payload accepted by adminListEventDirectory, the Admin Events directory. Events made in Catch and events imported from other platforms are one table; source narrows it to one of them. needsCheck keeps imported events not yet public; thisWeek keeps events starting in the next seven days. cursor is the opaque nextCursor of the previous page.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner, ops and support, sales associates)",
  "properties": {
    "view": {
      "type": "string",
      "enum": [
        "upcoming",
        "past",
        "cancelled"
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
    "source": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "catch",
        "imported",
        null
      ]
    },
    "organizerId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    },
    "needsCheck": {
      "type": "boolean"
    },
    "thisWeek": {
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
