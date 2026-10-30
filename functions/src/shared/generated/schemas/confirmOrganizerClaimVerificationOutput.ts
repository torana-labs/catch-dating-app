/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const confirmOrganizerClaimVerificationCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/confirm_organizer_claim_verification_response.schema.json",
  "title": "ConfirmOrganizerClaimVerificationCallableResponse",
  "description": "Callable response returned by confirmOrganizerClaimVerification after it reads the listing's Luma calendar for the attempt's code.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "attemptId",
    "status",
    "claimRequestId",
    "lastRejection"
  ],
  "properties": {
    "attemptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "status": {
      "description": "claimUnavailable: the page was claimed or closed meanwhile, so staff review is the way forward.",
      "type": "string",
      "enum": [
        "awaitingProof",
        "verified",
        "expired",
        "claimUnavailable"
      ]
    },
    "claimRequestId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    },
    "lastRejection": {
      "anyOf": [
        {
          "type": "string",
          "enum": [
            "codeNotFound",
            "pageUnavailable"
          ]
        },
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
