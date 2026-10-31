/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const activityNotificationDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/activity_notifications.schema.json",
  "title": "ActivityNotificationDocument",
  "description": "Canonical durable activity notification stored at notifications/{uid}/items/{notificationId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "activity_notifications",
  "x-firestore-path": "notifications/{uid}/items/{notificationId}",
  "x-document-id-field": "id",
  "x-owner": "notification fan-out functions and booking callables",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "uid",
    "type",
    "title",
    "body",
    "createdAt"
  ],
  "properties": {
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "type": {
      "type": "string",
      "enum": [
        "message",
        "match",
        "eventReminder",
        "eventSignup",
        "waitlistPromotion",
        "waitlistOffer",
        "waitlistOfferExpiring",
        "waitlistOfferExpired",
        "eventCancelled",
        "eventUpdated",
        "organizerUpdate",
        "formResponse",
        "crossPathsInvitation",
        "crossPathsInvitationAccepted",
        "crossPathsInvitationDeclined",
        "crossPathsPlanCancelled"
      ],
      "x-catch-ownership": "server-only"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160,
      "x-catch-ownership": "server-only"
    },
    "body": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "x-catch-ownership": "server-only"
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
      },
      "x-catch-ownership": "server-only"
    },
    "readAt": {
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
      ],
      "x-catch-ownership": "client-runtime-writable"
    },
    "matchId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "server-only"
    },
    "eventId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "postId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "invitationId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "actorUid": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "actorName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "x-catch-ownership": "server-only"
    },
    "synthetic": {
      "type": "boolean",
      "description": "Internal demo seed marker used for cleanup and diagnostics."
    },
    "seedPrefix": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed prefix used for cleanup and diagnostics."
    },
    "scenario": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed scenario name used for cleanup and diagnostics."
    },
    "demoOps": {
      "type": "boolean",
      "description": "Internal demo-operations marker used for cleanup and diagnostics."
    },
    "demoOpsId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "description": "Internal demo-operations id used for cleanup and diagnostics."
    },
    "demoOpsCommand": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "description": "Internal demo-operations command name used for cleanup and diagnostics."
    }
  }
} as const;
