/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const startOrganizerHostConversationCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/start_club_host_conversation_payload.schema.json",
  "title": "StartOrganizerHostConversationCallablePayload",
  "description": "Callable payload accepted by startOrganizerHostConversation.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "hostUid"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "hostUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    }
  }
} as const;
