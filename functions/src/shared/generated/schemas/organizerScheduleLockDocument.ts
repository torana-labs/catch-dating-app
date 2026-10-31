/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerScheduleLockDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_schedule_locks.schema.json",
  "title": "OrganizerScheduleLockDocument",
  "description": "Server-owned time-slot claim stored at organizerScheduleLocks/{organizerId_slot}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerScheduleLocks",
  "x-firestore-path": "organizerScheduleLocks/{lockId}",
  "x-document-id-field": "lockId",
  "x-owner": "event schedule conflict callables",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "ownerType",
    "ownerId",
    "slot",
    "eventId",
    "organizerId",
    "startTimeMillis",
    "endTimeMillis"
  ],
  "properties": {
    "ownerType": {
      "type": "string",
      "const": "organizer",
      "x-catch-ownership": "callable-owned"
    },
    "ownerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "slot": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
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
    "startTimeMillis": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "endTimeMillis": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
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
