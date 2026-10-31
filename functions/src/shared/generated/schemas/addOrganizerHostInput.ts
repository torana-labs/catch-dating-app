/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const addOrganizerHostCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/add_club_host_payload.schema.json",
  "title": "AddOrganizerHostCallablePayload",
  "description": "Callable payload accepted by addOrganizerHost.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId"
  ],
  "oneOf": [
    {
      "required": [
        "uid"
      ]
    },
    {
      "required": [
        "phoneNumber"
      ]
    }
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "phoneNumber": {
      "type": "string",
      "minLength": 6,
      "maxLength": 32
    }
  }
} as const;
