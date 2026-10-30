/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostContactSummaryDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_contact_summaries.schema.json",
  "title": "HostContactSummaryDocument",
  "description": "Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostContactSummaries",
  "x-firestore-path": "hostContactSummaries/{contactId}",
  "x-document-id-field": "contactId",
  "x-owner": "Host read model projector",
  "required": [
    "organizerId",
    "contactId",
    "searchName",
    "lastSeenAtMillis",
    "manualTagIds",
    "linkedAccount",
    "importedContact",
    "row",
    "version"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "searchName": {
      "type": "string",
      "maxLength": 320,
      "x-catch-ownership": "server-only"
    },
    "lastSeenAtMillis": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "manualTagIds": {
      "type": "array",
      "maxItems": 5,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "maxLength": 32
      },
      "x-catch-ownership": "server-only"
    },
    "linkedAccount": {
      "type": "boolean",
      "x-catch-ownership": "server-only"
    },
    "importedContact": {
      "type": "boolean",
      "x-catch-ownership": "server-only"
    },
    "row": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contactId",
        "displayName",
        "phoneE164",
        "email",
        "identityState",
        "identityConfidence",
        "ambiguousCandidateCount",
        "attendedEventCount",
        "expectedEventCount",
        "lastAttendedAtMillis",
        "segmentIds",
        "whatsappStatus",
        "whatsappAdminSuppressed",
        "smsStatus",
        "sourceCoverage",
        "revision"
      ],
      "properties": {
        "contactId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "displayName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "phoneE164": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^\\+[1-9][0-9]{7,14}$"
        },
        "email": {
          "type": [
            "string",
            "null"
          ],
          "format": "email",
          "maxLength": 320
        },
        "identityState": {
          "type": "string",
          "enum": [
            "unlinked",
            "verified",
            "ambiguous"
          ]
        },
        "identityConfidence": {
          "type": "string",
          "enum": [
            "eventOnly",
            "proposed",
            "verified"
          ]
        },
        "ambiguousCandidateCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 20
        },
        "attendedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "expectedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000000
        },
        "lastAttendedAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "segmentIds": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 16,
          "items": {
            "type": "string",
            "enum": [
              "new_to_organizer",
              "past_attendee",
              "first_time_attendee",
              "repeat_attendee",
              "regular",
              "lapsed_regular",
              "reliable_attendee",
              "needs_confirmation",
              "advocate",
              "high_impact_advocate",
              "whatsapp_reachable",
              "sms_reachable",
              "active_member",
              "lapsed_member",
              "member_no_recent_attendance",
              "frequent_non_member"
            ]
          }
        },
        "manualTags": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 5,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "tagId",
              "label"
            ],
            "properties": {
              "tagId": {
                "type": "string",
                "pattern": "^[a-f0-9]{32}$"
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40
              }
            }
          }
        },
        "whatsappStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "whatsappAdminSuppressed": {
          "type": "boolean"
        },
        "smsStatus": {
          "type": "string",
          "enum": [
            "unknown",
            "optedIn",
            "optedOut"
          ]
        },
        "sourceCoverage": {
          "type": "string",
          "enum": [
            "exact",
            "partial",
            "insufficientData"
          ]
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "membership": {
          "description": "CRM projection of one contact's paid membership with the organizer, through the contact's linked account.",
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "required": [
            "planId",
            "planName",
            "status",
            "memberSinceMillis",
            "entitled"
          ],
          "properties": {
            "planId": {
              "type": "string",
              "pattern": "^hmp_[A-Za-z0-9]{20}$"
            },
            "planName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 60
            },
            "status": {
              "enum": [
                "trialing",
                "active",
                "past_due",
                "paused",
                "canceling",
                "expired"
              ]
            },
            "memberSinceMillis": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "entitled": {
              "type": "boolean"
            }
          }
        }
      },
      "x-catch-ownership": "server-only"
    },
    "version": {
      "const": 1,
      "x-catch-ownership": "server-only"
    }
  }
} as const;
