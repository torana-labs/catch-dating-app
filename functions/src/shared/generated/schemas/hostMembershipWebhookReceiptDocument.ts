/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostMembershipWebhookReceiptDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_membership_webhook_receipts.schema.json",
  "title": "HostMembershipWebhookReceiptDocument",
  "description": "Server-only create-once dedupe receipt for one verified membership provider webhook delivery. Stores ids and outcome only, never the raw payload.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostMembershipWebhookReceipts",
  "x-firestore-path": "hostMembershipWebhookReceipts/{receiptId}",
  "x-document-id-field": "receiptId",
  "x-owner": "hostMembershipRazorpayWebhook",
  "required": [
    "schemaVersion",
    "provider",
    "providerEventId",
    "eventType",
    "subscriptionId",
    "paymentId",
    "outcome",
    "receivedAtMillis"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "server-only"
    },
    "provider": {
      "enum": [
        "razorpay"
      ],
      "x-catch-ownership": "server-only"
    },
    "providerEventId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "server-only"
    },
    "eventType": {
      "type": "string",
      "maxLength": 80,
      "x-catch-ownership": "server-only"
    },
    "subscriptionId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 60,
      "x-catch-ownership": "server-only"
    },
    "paymentId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 60,
      "x-catch-ownership": "server-only"
    },
    "outcome": {
      "enum": [
        "applied",
        "ignored",
        "stale"
      ],
      "x-catch-ownership": "server-only"
    },
    "receivedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    }
  }
} as const;
