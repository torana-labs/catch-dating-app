/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminApproveOrganizerListingCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_approve_organizer_listing_payload.schema.json",
  "title": "AdminApproveOrganizerListingCallablePayload",
  "description": "Staff approve a listing Supply Intake built from a nomination, an organizer's own submission or discovery. One transaction publishes the organizer page claimable and noindex, hidden in the app, records the review decision and receipt, and opens the organizer's Sales account, opportunity, tasks and activity.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "requestId",
    "listingWorkItemId",
    "contentHash",
    "name",
    "publicSlug",
    "marketId",
    "organizerType",
    "checklist",
    "note"
  ],
  "properties": {
    "requestId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$",
      "description": "The reviewer's idempotency key; a retry with the same content replays."
    },
    "listingWorkItemId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "contentHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "The listing content the reviewer saw. A listing rebuilt since then is refused."
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "publicSlug": {
      "type": "string",
      "minLength": 3,
      "maxLength": 64,
      "pattern": "^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$"
    },
    "marketId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "organizerType": {
      "type": "string",
      "enum": [
        "club",
        "community",
        "individual",
        "eventProducer",
        "venue",
        "brand"
      ],
      "description": "Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration."
    },
    "checklist": {
      "type": "object",
      "additionalProperties": false,
      "description": "The public-web publication checklist, every item confirmed.",
      "required": [
        "identityReviewed",
        "surfaceInventoryReviewed",
        "ownerSafeCopyReviewed",
        "marketScopeReviewed",
        "mediaRightsReviewed",
        "crawlDisabledReviewed",
        "claimTargetReviewed",
        "takedownPathReviewed",
        "impersonationReviewed"
      ],
      "properties": {
        "identityReviewed": {
          "const": true
        },
        "surfaceInventoryReviewed": {
          "const": true
        },
        "ownerSafeCopyReviewed": {
          "const": true
        },
        "marketScopeReviewed": {
          "const": true
        },
        "mediaRightsReviewed": {
          "const": true
        },
        "crawlDisabledReviewed": {
          "const": true
        },
        "claimTargetReviewed": {
          "const": true
        },
        "takedownPathReviewed": {
          "const": true
        },
        "impersonationReviewed": {
          "const": true
        }
      }
    },
    "note": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500
    }
  },
  "x-callable-aliases": [
    "adminApproveOrganizerListing"
  ]
} as const;
