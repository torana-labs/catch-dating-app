/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageHostMembershipProgramCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_host_membership_program_payload.schema.json",
  "title": "ManageHostMembershipProgramCallablePayload",
  "description": "Organizer-manager read and control of the organizer's paid membership program: enable with the ready Route account, disable, and host-wide billing pause/resume.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Host memberships settings",
  "required": [
    "action",
    "organizerId"
  ],
  "properties": {
    "action": {
      "enum": [
        "get",
        "enable",
        "disable",
        "pauseBilling",
        "resumeBilling"
      ],
      "type": "string"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    }
  }
} as const;
