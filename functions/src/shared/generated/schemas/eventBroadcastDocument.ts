/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventBroadcastDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_broadcasts.schema.json",
  "title": "EventBroadcastDocument",
  "description": "Server-owned delivery receipt for an organizer event broadcast stored at eventBroadcasts/{broadcastId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventBroadcasts",
  "x-firestore-path": "eventBroadcasts/{broadcastId}",
  "x-document-id-field": "id",
  "x-owner": "sendEventBroadcast callable",
  "required": [
    "eventId",
    "organizerId",
    "actorUid",
    "audience",
    "title",
    "body",
    "targetUids",
    "status",
    "recipientCount",
    "excludedCount",
    "activityAvailableCount",
    "pushAttemptedCount",
    "pushAcceptedCount",
    "pushFailedCount",
    "pushUnknownCount",
    "pushErrorCodes",
    "deliveries",
    "leaseOwner",
    "leaseExpiresAt",
    "expiresAt",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "actorUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "audience": {
      "type": "string",
      "enum": [
        "booked",
        "prospective",
        "everyone"
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
    "targetUids": {
      "type": "array",
      "maxItems": 500,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      },
      "x-catch-ownership": "server-only"
    },
    "status": {
      "type": "string",
      "enum": [
        "processing",
        "completed",
        "partial",
        "failed"
      ],
      "x-catch-ownership": "server-only"
    },
    "recipientCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "excludedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "activityAvailableCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "pushAttemptedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "pushAcceptedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "pushFailedCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "pushUnknownCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "server-only"
    },
    "pushErrorCodes": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "x-catch-ownership": "server-only"
    },
    "deliveries": {
      "type": "object",
      "maxProperties": 500,
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "activityStatus",
          "pushStatus",
          "activityNotificationId"
        ],
        "properties": {
          "activityStatus": {
            "type": "string",
            "enum": [
              "created",
              "existing",
              "failed"
            ]
          },
          "pushStatus": {
            "type": "string",
            "enum": [
              "ineligible",
              "accepted",
              "failed",
              "unknown"
            ]
          },
          "activityNotificationId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "excluded": {
            "type": "boolean"
          },
          "errorCode": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          }
        }
      },
      "x-catch-ownership": "server-only"
    },
    "leaseOwner": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "leaseExpiresAt": {
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
      },
      "x-catch-ownership": "server-only"
    },
    "completedAt": {
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
      "x-catch-ownership": "server-only"
    }
  }
} as const;
