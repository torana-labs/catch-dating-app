/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const recordOrganizerAnalyticsEventCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/record_organizer_analytics_event_payload.schema.json",
  "title": "RecordOrganizerAnalyticsEventCallablePayload",
  "description": "Public website analytics event for host-visible organizer metrics. The callable validates organizer scope and writes a raw, aggregate-safe event to BigQuery.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "eventName",
    "pagePath"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "eventId": {
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
    "eventName": {
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
    "linkId": {
      "description": "The owner link a linkClick opened, one of the organizer's ownerLinks ids. Other events send null.",
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
    "trafficSource": {
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
    "pagePath": {
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
    "sessionId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 80
    },
    "platform": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 40
    }
  },
  "definitions": {
    "trafficSource": {
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
    }
  }
} as const;
