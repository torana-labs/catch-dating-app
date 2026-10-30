/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const exportOrganizerContactsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/export_organizer_contacts_payload.schema.json",
  "title": "ExportOrganizerContactsCallablePayload",
  "description": "Manager-only bounded organizer audience export request.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "segmentId": {
      "anyOf": [
        {
          "type": "string",
          "enum": [
            "new_to_organizer",
            "past_attendee",
            "first_time_attendee",
            "repeat_attendee",
            "regular",
            "lapsed_regular",
            "reliable_attendee",
            "needs_confirmation",
            "advocate",
            "high_impact_advocate",
            "whatsapp_reachable",
            "sms_reachable",
            "active_member",
            "lapsed_member",
            "member_no_recent_attendance",
            "frequent_non_member"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "segmentIds": {
      "type": "array",
      "maxItems": 12,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "new_to_organizer",
          "past_attendee",
          "first_time_attendee",
          "repeat_attendee",
          "regular",
          "lapsed_regular",
          "reliable_attendee",
          "needs_confirmation",
          "advocate",
          "high_impact_advocate",
          "whatsapp_reachable",
          "sms_reachable",
          "active_member",
          "lapsed_member",
          "member_no_recent_attendance",
          "frequent_non_member"
        ]
      },
      "description": "OR within attendance, reliability, advocacy and reachable categories; AND across selected categories."
    },
    "manualTagIds": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "pattern": "^[a-f0-9]{32}$"
      },
      "description": "Match any selected manual tag, combined with all selected segment categories."
    },
    "query": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120
    },
    "manualTagId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-f0-9]{32}$"
    }
  }
} as const;
