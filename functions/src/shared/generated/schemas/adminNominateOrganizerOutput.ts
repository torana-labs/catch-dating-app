/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminNominateOrganizerCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_nominate_organizer_response.schema.json",
  "title": "AdminNominateOrganizerCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "requestId",
    "created",
    "status"
  ],
  "properties": {
    "requestId": {
      "type": "string",
      "pattern": "^nom-[a-f0-9]{40}$"
    },
    "created": {
      "type": "boolean"
    },
    "status": {
      "const": "queued"
    }
  }
} as const;
