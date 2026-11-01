/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listOrganizerGuestBlocksCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/list_organizer_guest_blocks_payload.schema.json",
  "title": "ListOrganizerGuestBlocksCallablePayload",
  "description": "Lists who an organizer has blocked from booking their events.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    }
  },
  "x-callable-aliases": [
    "listOrganizerGuestBlocks"
  ]
} as const;
