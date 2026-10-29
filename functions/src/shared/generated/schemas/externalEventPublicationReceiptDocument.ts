/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const externalEventPublicationReceiptDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/external_event_publication_receipts.schema.json",
  "title": "ExternalEventPublicationReceiptDocument",
  "description": "Immutable idempotency and audit receipt for a dry-run or applied external-event publication/takedown action.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "externalEventPublicationReceipts",
  "x-firestore-path": "externalEventPublicationReceipts/{receiptId}",
  "x-document-id-field": "receiptId",
  "x-owner": "adminPublishListingEvents and adminTakedownExternalEvent callables and the onSupplyIntakeListingApproved trigger",
  "required": [
    "schemaVersion",
    "receiptId",
    "idempotencyKey",
    "inputHash",
    "action",
    "executionMode",
    "outcome",
    "eventId",
    "targetPath",
    "sourceActionId",
    "externalLinkCount",
    "reviewNote",
    "actorUid",
    "createdAt"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 1
    },
    "receiptId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 180
    },
    "inputHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "action": {
      "type": "string",
      "enum": [
        "publish",
        "takedown"
      ]
    },
    "executionMode": {
      "type": "string",
      "enum": [
        "dry_run",
        "apply"
      ]
    },
    "outcome": {
      "type": "string",
      "enum": [
        "would_publish",
        "published",
        "would_remove",
        "removed"
      ]
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "targetPath": {
      "type": "string",
      "pattern": "^externalEvents/[A-Za-z0-9_-]{1,180}$"
    },
    "sourceActionId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240
    },
    "externalLinkCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 12
    },
    "reviewNote": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
    "actorUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "createdAt": {
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
      }
    }
  }
} as const;
