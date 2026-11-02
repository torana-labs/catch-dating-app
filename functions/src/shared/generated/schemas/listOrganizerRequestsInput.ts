/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listOrganizerRequestsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/list_organizer_requests_payload.schema.json",
  "title": "ListOrganizerRequestsCallablePayload",
  "description": "An organizer's host reads everyone waiting to be let in across that organizer's coming events: join requests and the waitlist.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Organizer hosts (Host app Requests)",
  "required": [
    "organizerId"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    }
  }
} as const;
