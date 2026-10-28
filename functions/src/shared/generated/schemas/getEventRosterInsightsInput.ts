/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const getEventRosterInsightsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/get_event_roster_insights_payload.schema.json",
  "title": "GetEventRosterInsightsCallablePayload",
  "description": "Organizer-manager request for event-relative CRM labels on one operational roster.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "eventId"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "includeHostMembership": {
      "type": "boolean",
      "description": "Opt-in for the paid-membership \"member\" signal; older clients omit it."
    }
  }
} as const;
