/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminRefreshOrganizerEventsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_refresh_organizer_events_response.schema.json",
  "title": "AdminRefreshOrganizerEventsCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "requestId",
    "created",
    "status",
    "urls"
  ],
  "properties": {
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "created": {
      "type": "boolean",
      "description": "False when a retry found the request it made before."
    },
    "status": {
      "const": "queued"
    },
    "urls": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 2000
      }
    }
  }
} as const;
