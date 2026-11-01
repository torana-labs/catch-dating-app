/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const submitSafetyAppealCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/submit_safety_appeal_payload.schema.json",
  "title": "SubmitSafetyAppealCallablePayload",
  "description": "The account appeals one safety action taken against it. Each action can be appealed once.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "actionId",
    "text"
  ],
  "properties": {
    "actionId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{8,128}$"
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    }
  },
  "x-callable-aliases": [
    "submitSafetyAppeal"
  ]
} as const;
