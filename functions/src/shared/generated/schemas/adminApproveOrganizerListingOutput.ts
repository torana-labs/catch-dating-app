/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminApproveOrganizerListingCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_approve_organizer_listing_response.schema.json",
  "title": "AdminApproveOrganizerListingCallableResponse",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "approvalId",
    "organizerId",
    "organizerPath",
    "created",
    "publishStatus",
    "indexStatus",
    "appVisibility",
    "claimState",
    "salesOwnerUid"
  ],
  "properties": {
    "approvalId": {
      "type": "string",
      "pattern": "^listing-[a-f0-9]{40}$"
    },
    "organizerId": {
      "type": "string",
      "minLength": 3,
      "maxLength": 64
    },
    "organizerPath": {
      "type": "string",
      "pattern": "^organizers/[^/]+$"
    },
    "created": {
      "type": "boolean",
      "description": "False when this exact approval had already been applied."
    },
    "publishStatus": {
      "const": "published"
    },
    "indexStatus": {
      "const": "noindex"
    },
    "appVisibility": {
      "const": "hidden"
    },
    "claimState": {
      "const": "unclaimed"
    },
    "salesOwnerUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    }
  }
} as const;
