/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listOrganizerBillsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/list_organizer_bills_payload.schema.json",
  "title": "ListOrganizerBillsCallablePayload",
  "description": "An organizer's owner reads Catch's monthly bills to that organizer in the host app.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Organizer owners (Host app Payments)",
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
