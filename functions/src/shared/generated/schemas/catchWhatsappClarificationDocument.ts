/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const catchWhatsappClarificationDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/catch_whatsapp_clarifications.schema.json",
  "title": "CatchWhatsappClarificationDocument",
  "description": "Catch asked a nominator whether their last message was a nomination or a question, and is waiting for \"1\" or \"2\". Keyed by the sender's endpoint hash, so each sender has at most one open question; it names the inbound receipt the answer applies to and expires after 24 hours. Keeps no message text.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "catchWhatsappClarifications",
  "x-firestore-path": "catchWhatsappClarifications/{endpointHash}",
  "x-document-id-field": "endpointHash",
  "x-owner": "Catch WhatsApp inbound router",
  "required": [
    "schemaVersion",
    "endpointHash",
    "sourceEventId",
    "askedAtMillis",
    "expiresAt"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "endpointHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "sourceEventId": {
      "type": "string",
      "pattern": "^cwhe_[a-f0-9]{64}$"
    },
    "askedAtMillis": {
      "type": "integer",
      "minimum": 0
    },
    "expiresAt": {
      "type": "object",
      "description": "Serialized Firestore Timestamp fixture shape.",
      "x-firestore-type": "timestamp",
      "additionalProperties": false,
      "required": [
        "_seconds",
        "_nanoseconds"
      ],
      "properties": {
        "_seconds": {
          "type": "integer"
        },
        "_nanoseconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999999999
        }
      },
      "x-firestore-ttl": true
    }
  }
} as const;
