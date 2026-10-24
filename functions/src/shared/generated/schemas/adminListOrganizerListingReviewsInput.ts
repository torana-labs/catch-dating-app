/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListOrganizerListingReviewsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_list_organizer_listing_reviews_payload.schema.json",
  "title": "AdminListOrganizerListingReviewsCallablePayload",
  "description": "One page of listings Supply Intake built that staff have not approved yet, newest first.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "limit",
    "cursor"
  ],
  "properties": {
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50
    },
    "cursor": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 400,
          "pattern": "^[A-Za-z0-9_-]+$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "x-callable-aliases": [
    "adminListOrganizerListingReviews"
  ]
} as const;
