/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const confirmOrganizerClaimVerificationCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/confirm_organizer_claim_verification_payload.schema.json",
  "title": "ConfirmOrganizerClaimVerificationCallablePayload",
  "description": "Callable payload accepted by confirmOrganizerClaimVerification.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "attemptId"
  ],
  "properties": {
    "attemptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    }
  }
} as const;
