/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventRuntimeClaimRequestDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_runtime_claim_requests.schema.json",
  "title": "EventRuntimeClaimRequestDocument",
  "description": "Host-reviewable pending runtime identity claim stored at eventRuntimeClaimRequests/{eventId_uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventRuntimeClaimRequests",
  "x-firestore-path": "eventRuntimeClaimRequests/{requestId}",
  "x-document-id-field": "id",
  "x-owner": "runtime claim and Host approval callables; no client writes",
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "displayName",
    "phoneLastFour",
    "candidateAttendeeIds",
    "status",
    "reviewedBy",
    "reviewReason",
    "createdAt",
    "updatedAt",
    "reviewedAt"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "phoneLastFour": {
      "type": "string",
      "pattern": "^[0-9]{4}$"
    },
    "candidateAttendeeIds": {
      "type": "array",
      "uniqueItems": true,
      "maxItems": 20,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      }
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "approved",
        "rejected",
        "cancelled"
      ]
    },
    "reviewedBy": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "reviewReason": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240
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
    },
    "updatedAt": {
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
    },
    "reviewedAt": {
      "anyOf": [
        {
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
        },
        {
          "type": "null"
        }
      ]
    }
  }
} as const;
