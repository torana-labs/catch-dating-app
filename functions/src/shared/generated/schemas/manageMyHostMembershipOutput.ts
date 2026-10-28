/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageMyHostMembershipCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/manage_my_host_membership_response.schema.json",
  "title": "ManageMyHostMembershipCallableResponse",
  "description": "Membership status after the member action is applied with the provider.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "membershipId",
    "status",
    "cancelAtPeriodEnd",
    "currentPeriodEndMillis"
  ],
  "properties": {
    "membershipId": {
      "type": "string",
      "pattern": "^hm_[a-f0-9]{64}$"
    },
    "status": {
      "enum": [
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceling",
        "expired"
      ]
    },
    "cancelAtPeriodEnd": {
      "type": "boolean"
    },
    "currentPeriodEndMillis": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991
    }
  }
} as const;
