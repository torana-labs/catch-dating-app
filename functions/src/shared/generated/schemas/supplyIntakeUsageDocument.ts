/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const supplyIntakeUsageDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/supply_intake_usage.schema.json",
  "title": "SupplyIntakeUsageDocument",
  "description": "Durable monthly network usage for Supply Intake: page fetches at {monthKey}, handle web searches at web-search-{monthKey}. The worker reserves an intake's allowance here in a transaction before any request leaves the process (and releases unused page fetches); the monthly caps in acquisition_policy.json are enforced against these counts, never against process memory.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "supplyIntakeUsage",
  "x-firestore-path": "supplyIntakeUsage/{monthKey}",
  "x-document-id-field": "monthKey",
  "x-owner": "trusted Supply Intake worker",
  "required": [
    "schemaVersion",
    "monthKey",
    "networkRequests",
    "updatedAt"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "monthKey": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}$"
    },
    "networkRequests": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    }
  }
} as const;
