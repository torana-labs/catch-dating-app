/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const publicRouteReservationDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/public_route_reservations.schema.json",
  "title": "PublicRouteReservationDocument",
  "description": "Server-owned reservation for a public website route. Stored at publicRouteReservations/{routeKey}; routeKey is derived from the normalized route path so route allocation is deterministic and transactionally claimable.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "publicRouteReservations",
  "x-firestore-path": "publicRouteReservations/{routeKey}",
  "x-document-id-field": "routeKey",
  "x-owner": "admin organizer publishing callables",
  "required": [
    "routeKey",
    "routePath",
    "routeKind",
    "routeSegments",
    "status",
    "ownerType",
    "ownerCollection",
    "ownerId",
    "targetPath",
    "slug",
    "citySlug",
    "createdAt",
    "updatedAt",
    "lastVerifiedAt",
    "lastVerifiedByUid",
    "lastVerifiedSource"
  ],
  "properties": {
    "routeKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 220,
      "pattern": "^[a-z0-9-]+(?:__[a-z0-9-]+)*$",
      "description": "Deterministic document id derived from routePath by removing leading/trailing slash and replacing route separators with double underscores.",
      "x-catch-ownership": "server-only"
    },
    "routePath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "pattern": "^/organizers/([a-z0-9-]+/)?[a-z0-9-]+/$",
      "x-catch-ownership": "server-only"
    },
    "routeKind": {
      "type": "string",
      "enum": [
        "organizerCanonical"
      ],
      "x-catch-ownership": "server-only"
    },
    "routeSegments": {
      "type": "array",
      "minItems": 2,
      "maxItems": 3,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80,
        "pattern": "^[a-z0-9-]+$"
      },
      "x-catch-ownership": "server-only"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "released"
      ],
      "x-catch-ownership": "server-only"
    },
    "ownerType": {
      "type": "string",
      "enum": [
        "club",
        "organizer"
      ],
      "x-catch-ownership": "server-only"
    },
    "ownerCollection": {
      "type": "string",
      "enum": [
        "clubs",
        "organizers"
      ],
      "x-catch-ownership": "server-only"
    },
    "ownerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "targetPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 260,
      "pattern": "^(clubs|organizers)/[^/]+$",
      "x-catch-ownership": "server-only"
    },
    "slug": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z0-9-]+$",
      "x-catch-ownership": "server-only"
    },
    "citySlug": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "pattern": "^[a-z0-9-]+$",
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
    "lastVerifiedAt": {
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
    "lastVerifiedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "lastVerifiedSource": {
      "type": "string",
      "enum": [
        "adminUpdateClubDetails",
        "adminSetClubIndexStatus",
        "adminUpdateOrganizerDetails",
        "adminSetOrganizerIndexStatus",
        "adminCreateOrganizerDraftFromCandidate",
        "adminApproveOrganizerListing",
        "createOrganizer",
        "clubsToOrganizersMigration"
      ],
      "x-catch-ownership": "server-only"
    },
    "releasedAt": {
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
    },
    "releasedByUid": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "server-only"
    },
    "replacementRoutePath": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240,
      "pattern": "^/organizers/([a-z0-9-]+/)?[a-z0-9-]+/$",
      "x-catch-ownership": "server-only"
    }
  }
} as const;
