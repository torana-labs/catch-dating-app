/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const publicPageBuildDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/public_page_builds.schema.json",
  "title": "PublicPageBuildDocument",
  "description": "Private build marker for one organizer's public page read models, stored at publicPageBuilds/{organizerId}. Each committed rebuild records when it read its sources, so a slower rebuild that read older sources is discarded instead of overwriting a newer page or reviving a withdrawn one.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "publicPageBuilds",
  "x-firestore-path": "publicPageBuilds/{organizerId}",
  "x-document-id-field": "organizerId",
  "x-catch-ownership": "server-only",
  "x-owner": "functions/src/publicPages rebuild commits only. No client reads or writes.",
  "required": [
    "schemaVersion",
    "organizerId",
    "sourceReadAt",
    "published",
    "eventPageCount"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sourceReadAt": {
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
    "published": {
      "type": "boolean",
      "description": "Whether the last committed rebuild produced an organizer page."
    },
    "eventPageCount": {
      "type": "integer",
      "minimum": 0
    }
  }
} as const;
