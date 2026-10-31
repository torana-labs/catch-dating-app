/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerMembershipCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/club_membership_payload.schema.json",
  "title": "OrganizerMembershipCallablePayload",
  "description": "Retired legacy membership payload retained only for schema-history decoding.",
  "type": "object",
  "additionalProperties": false,
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
