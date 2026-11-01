/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetOrganizerOverviewCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_organizer_overview_payload.schema.json",
  "title": "AdminGetOrganizerOverviewCallablePayload",
  "description": "Callable payload accepted by adminGetOrganizerOverview, the Overview tab of an Admin organizer page.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner, ops and support, sales associates)",
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
