/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostAnalyticsEventSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/bigquery/host_analytics_event.schema.json",
  "title": "HostAnalyticsEvent",
  "description": "Raw aggregate-safe BigQuery event for host-visible organizer analytics. This is the source event table for discovery metrics; Firestore must not be the source of truth for these counters.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "analytics_event_id",
    "occurred_at",
    "event_date",
    "event_name",
    "club_id",
    "page_path",
    "ingested_at"
  ],
  "properties": {
    "analytics_event_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160
    },
    "occurred_at": {
      "type": "string",
      "format": "date-time"
    },
    "event_date": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "event_name": {
      "type": "string",
      "enum": [
        "listingView",
        "searchAppearance",
        "eventView",
        "organizerSave",
        "eventSave",
        "contactClick",
        "claimClick",
        "outboundClick",
        "linkClick"
      ]
    },
    "club_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "target_event_id": {
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
    "page_path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
    },
    "source": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 80
    },
    "session_hash": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 128
    },
    "platform": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 40
    },
    "link_id": {
      "description": "The owner link a linkClick opened; null for other events.",
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
    "traffic_source": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "instagram",
        "whatsapp",
        "facebook",
        "google",
        "qr",
        "email",
        "direct",
        "other",
        null
      ],
      "description": "Where the visitor came from, mapped by the page from its referrer host or ?via= to this fixed list. Raw referrers and campaign values are never sent."
    },
    "ingested_at": {
      "type": "string",
      "format": "date-time"
    }
  }
} as const;
