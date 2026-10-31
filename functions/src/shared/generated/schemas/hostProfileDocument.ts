/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostProfileDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_profiles.schema.json",
  "title": "HostProfileDocument",
  "description": "Professional host identity stored at hostProfiles/{uid}. This document is separate from users/{uid} dating profile data and publicProfiles/{uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostProfiles",
  "x-firestore-path": "hostProfiles/{uid}",
  "x-document-id-field": "uid",
  "x-owner": "owner direct write, callable seeded during host club operations",
  "required": [
    "displayName",
    "status",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "pattern": ".*\\S.*",
      "description": "Professional display name for host, club, event, and support-chat surfaces."
    },
    "avatarUrl": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 2048,
      "description": "Professional host avatar or organization logo URL."
    },
    "roleTitle": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 80,
      "description": "Professional title such as Founder, Coach, Organizer, or Community Lead."
    },
    "bio": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500,
      "description": "Professional host bio. Must not mirror dating-profile prompts."
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "pending",
        "suspended"
      ]
    },
    "verified": {
      "type": "boolean"
    },
    "linkedOrganizerIds": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 160
      }
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
    }
  }
} as const;
