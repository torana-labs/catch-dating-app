/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const reportGuestCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/report_guest_payload.schema.json",
  "title": "ReportGuestCallablePayload",
  "description": "An organizer, their manager or the event's team reports a guest, including what happened at an event. It lands in the Safety queue like any report.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "eventId",
    "targetUserId",
    "reasonCode",
    "notes"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "eventId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "targetUserId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{1,128}$"
    },
    "reasonCode": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]{1,63}$"
    },
    "notes": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 2000
    }
  },
  "x-callable-aliases": [
    "reportGuest"
  ]
} as const;
