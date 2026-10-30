/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageMyHostMembershipCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_my_host_membership_payload.schema.json",
  "title": "ManageMyHostMembershipCallablePayload",
  "description": "Member self-serve: pause billing (suspends entitlements), resume, or cancel at the end of the current period.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Consumer My memberships",
  "required": [
    "action",
    "membershipId"
  ],
  "properties": {
    "action": {
      "enum": [
        "pause",
        "resume",
        "cancelAtPeriodEnd"
      ],
      "type": "string"
    },
    "membershipId": {
      "type": "string",
      "pattern": "^hm_[a-f0-9]{64}$"
    }
  }
} as const;
