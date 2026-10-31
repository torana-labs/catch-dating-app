/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostAnalyticsQueryCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/host_analytics_query_payload.schema.json",
  "title": "HostAnalyticsQueryCallablePayload",
  "description": "Callable payload accepted by getHostAnalytics and adminGetHostAnalytics.",
  "x-callable-aliases": [
    "getHostAnalytics",
    "adminGetHostAnalytics"
  ],
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "organizerId": {
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
    "rangePreset": {
      "type": "string",
      "enum": [
        "7d",
        "30d",
        "90d",
        "12m",
        "month",
        "custom"
      ]
    },
    "startDate": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "endDate": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "granularity": {
      "type": "string",
      "enum": [
        "day",
        "week",
        "month"
      ]
    },
    "timezone": {
      "type": "string",
      "minLength": 1,
      "maxLength": 64
    }
  }
} as const;
