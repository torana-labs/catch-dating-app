/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const startOrganizerClaimVerificationCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/start_organizer_claim_verification_response.schema.json",
  "title": "StartOrganizerClaimVerificationCallableResponse",
  "description": "Callable response returned by startOrganizerClaimVerification: the live attempt and the code to show. Starting again while an attempt has more than five minutes left returns that attempt.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "attemptId",
    "organizerId",
    "method",
    "code",
    "proofTarget",
    "catchInstagramHandle",
    "expiresAt"
  ],
  "properties": {
    "attemptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
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
    },
    "code": {
      "type": "string",
      "pattern": "^[0-9]{6}$"
    },
    "proofTarget": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
    },
    "catchInstagramHandle": {
      "description": "Catch's Instagram username without @, for instagramMessage attempts.",
      "type": [
        "string",
        "null"
      ],
      "maxLength": 30
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    }
  }
} as const;
