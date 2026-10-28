/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const startOrganizerClaimVerificationCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/start_organizer_claim_verification_payload.schema.json",
  "title": "StartOrganizerClaimVerificationCallablePayload",
  "description": "Callable payload accepted by startOrganizerClaimVerification.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "method"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "method": {
      "type": "string",
      "enum": [
        "instagramMessage",
        "lumaDescription"
      ]
    }
  }
} as const;
