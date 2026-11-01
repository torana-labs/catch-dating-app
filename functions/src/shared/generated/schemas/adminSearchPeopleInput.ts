/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminSearchPeopleCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_search_people_payload.schema.json",
  "title": "AdminSearchPeopleCallablePayload",
  "description": "Search people by name, phone or user id; every search is written to the admin audit log.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "query",
    "limit"
  ],
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 25
    }
  },
  "x-callable-aliases": [
    "adminSearchPeople"
  ]
} as const;
