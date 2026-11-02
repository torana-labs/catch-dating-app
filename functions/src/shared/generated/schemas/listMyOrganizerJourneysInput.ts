/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listMyOrganizerJourneysCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/list_my_organizer_journeys_payload.schema.json",
  "title": "ListMyOrganizerJourneysCallablePayload",
  "description": "A host reads how an organizer's page got here. With organizerId, that organizer's journey for its hosts. With null, the journey of each page the caller has asked to claim and is still waiting on.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Organizer hosts and claimants (Host app)",
  "required": [
    "organizerId"
  ],
  "properties": {
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
    }
  }
} as const;
