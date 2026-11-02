/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetOrganizerListingReviewCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_organizer_listing_review_payload.schema.json",
  "title": "AdminGetOrganizerListingReviewCallablePayload",
  "description": "One Supply Intake listing awaiting approval, by its request, with what a reviewer needs to approve it.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "requestId"
  ],
  "properties": {
    "requestId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$"
    }
  },
  "x-callable-aliases": [
    "adminGetOrganizerListingReview"
  ]
} as const;
