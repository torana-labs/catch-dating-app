/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminPublishListingEventsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_publish_listing_events_payload.schema.json",
  "title": "AdminPublishListingEventsCallablePayload",
  "description": "A staff member publishes, or dry-runs, some or all of the events Supply Intake imported for one approved organizer listing as read-only, outbound-only externalEvents. Each event is planned and checked on its own; blocked events are reported, not written. Their resolutions or cited policy waivers clear governed blockers per event.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "intakeRequestId",
    "eventWorkItemIds",
    "executionMode",
    "idempotencyKey",
    "reviewNote",
    "checklist",
    "blockerResolutions"
  ],
  "properties": {
    "intakeRequestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "eventWorkItemIds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 60,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
      }
    },
    "executionMode": {
      "type": "string",
      "enum": [
        "dry_run",
        "apply"
      ]
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 120,
      "pattern": "^[A-Za-z0-9:_-]+$",
      "description": "The reviewer's key; each event's receipt is keyed on it, so a retry replays."
    },
    "reviewNote": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "checklist": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "outboundLinksReviewed",
        "noCatchBookingPaymentsWaitlist",
        "ownerSafeCopyReviewed"
      ],
      "properties": {
        "outboundLinksReviewed": {
          "type": "boolean"
        },
        "noCatchBookingPaymentsWaitlist": {
          "type": "boolean"
        },
        "ownerSafeCopyReviewed": {
          "type": "boolean"
        }
      }
    },
    "blockerResolutions": {
      "type": "array",
      "maxItems": 120,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "eventWorkItemId",
          "blockerCode",
          "outcome",
          "policyGapDecisionId",
          "note"
        ],
        "properties": {
          "eventWorkItemId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
          },
          "blockerCode": {
            "type": "string",
            "enum": [
              "missing_exact_coordinates",
              "missing_end_time",
              "missing_location_detail",
              "requires_event_defaults_policy",
              "requires_owner_safe_copy_review",
              "duplicate_normalized_event_key"
            ]
          },
          "outcome": {
            "type": "string",
            "enum": [
              "resolved",
              "waived"
            ]
          },
          "policyGapDecisionId": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 180
          },
          "note": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          }
        }
      }
    },
    "eventLocations": {
      "type": "array",
      "maxItems": 60,
      "description": "Map locations the reviewer supplied for events whose source page gave none. The coordinates clear missing_exact_coordinates; a venue name or address fills one the page left out.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "eventWorkItemId",
          "name",
          "address",
          "placeId",
          "latitude",
          "longitude"
        ],
        "properties": {
          "eventWorkItemId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
          },
          "name": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 240
          },
          "address": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 500
          },
          "placeId": {
            "type": [
              "string",
              "null"
            ],
            "minLength": 1,
            "maxLength": 256
          },
          "latitude": {
            "type": "number",
            "minimum": -90,
            "maximum": 90
          },
          "longitude": {
            "type": "number",
            "minimum": -180,
            "maximum": 180
          }
        }
      }
    }
  },
  "x-callable-aliases": [
    "adminPublishListingEvents"
  ]
} as const;
