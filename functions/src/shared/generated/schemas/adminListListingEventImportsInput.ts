/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListListingEventImportsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_listing_event_imports_payload.schema.json",
  "title": "AdminListListingEventImportsCallablePayload",
  "description": "One page of approved Supply Intake listings, most recently approved first, each with the events it imported and where each stands: published (by the publication policy or staff), withdrawn, ready for staff, needing a resolution, or blocked.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "limit",
    "cursor"
  ],
  "properties": {
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    },
    "cursor": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 400,
          "pattern": "^[A-Za-z0-9_-]+$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-callable-aliases": [
    "adminListListingEventImports"
  ]
} as const;
