/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetListingEventReviewCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_listing_event_review_payload.schema.json",
  "title": "AdminGetListingEventReviewCallablePayload",
  "description": "Reads one imported event of an approved listing for the inbox's publish sheet.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "intakeRequestId",
    "eventWorkItemId"
  ],
  "properties": {
    "intakeRequestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "eventWorkItemId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    }
  }
} as const;
