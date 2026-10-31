/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventInviteLinkDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_invite_links.schema.json",
  "title": "EventInviteLinkDocument",
  "description": "Opaque event invitation metadata stored at eventInviteLinks/{inviteLinkId}. The public bearer token is stored separately in a server-only secret document.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventInviteLinks",
  "x-firestore-path": "eventInviteLinks/{inviteLinkId}",
  "x-document-id-field": "id",
  "x-owner": "event invite link callables and event-success scorecard recomputation",
  "required": [
    "eventId",
    "organizerId",
    "hostUid",
    "label",
    "source",
    "tokenHash",
    "openCount",
    "requestCount",
    "confirmedCount",
    "paidCount",
    "checkedInCount",
    "catcherCount",
    "matchCount",
    "chatStartedCount",
    "disabledAt",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "hostUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "label": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "x-catch-ownership": "callable-owned"
    },
    "source": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 80,
      "x-catch-ownership": "callable-owned"
    },
    "tokenHash": {
      "type": "string",
      "minLength": 64,
      "maxLength": 64,
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "callable-owned"
    },
    "contractVersion": {
      "type": "integer",
      "minimum": 2,
      "maximum": 2,
      "x-catch-ownership": "callable-owned"
    },
    "linkKind": {
      "type": "string",
      "enum": [
        "hostChannel",
        "directRecipient",
        "attendeeReferrer",
        "promoter",
        "partner"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "ownerContactId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "ownerUid": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "intendedRecipientContactId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "campaignId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "issuanceChannel": {
      "type": "string",
      "enum": [
        "hostApp",
        "consumerApp",
        "runtimeWeb",
        "campaign",
        "api",
        "formAutomation"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "destinationKind": {
      "type": "string",
      "enum": [
        "catchEvent",
        "eventRuntime",
        "externalBooking",
        "marketingLanding"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "tokenVersion": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "x-catch-ownership": "callable-owned"
    },
    "attributionWindowEndsAt": {
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
      "x-catch-ownership": "callable-owned"
    },
    "openCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "likelyHumanOpenCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "shareIntentCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "verifiedRegistrationCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "referredRegistrationCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "referredCheckedInCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "requestCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "confirmedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "paidCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "checkedInCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "catcherCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "matchCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "chatStartedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "trigger-owned"
    },
    "disabledAt": {
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
      "x-catch-ownership": "callable-owned"
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
      "x-catch-ownership": "callable-owned"
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
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
