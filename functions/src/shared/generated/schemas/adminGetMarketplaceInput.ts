/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetMarketplaceCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_get_marketplace_payload.schema.json",
  "title": "AdminGetMarketplaceCallablePayload",
  "description": "Owner reads the Marketplace: events, places filled, no-shows and waitlists by city over the last 7, 30 or 90 days; guests by the month they first booked and whether they came back; bookings each week; organizers going quiet. marketId narrows to one city.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Admin Owner)",
  "required": [
    "rangeDays",
    "marketId"
  ],
  "properties": {
    "rangeDays": {
      "enum": [
        7,
        30,
        90
      ]
    },
    "marketId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[a-z][a-z0-9-]{1,49}$"
    }
  }
} as const;
