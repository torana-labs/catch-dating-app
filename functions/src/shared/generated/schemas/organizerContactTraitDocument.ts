/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerContactTraitDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_contact_traits.schema.json",
  "title": "OrganizerContactTraitDocument",
  "description": "Rebuildable, explainable organizer-contact CRM traits. Sensitive Event Success answers are excluded by contract.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerContactTraits",
  "x-firestore-path": "organizerContactTraits/{contactId}",
  "x-document-id-field": "contactId",
  "x-owner": "organizer audience projection",
  "required": [
    "organizerId",
    "contactId",
    "expectedEventCount",
    "attendedEventCount",
    "cancelledEventCount",
    "noShowCount",
    "importedEventCount",
    "referredRegistrationCount",
    "referredCheckedInCount",
    "referredCheckedIn365DayCount",
    "linkedAccount",
    "firstSeenAt",
    "lastSeenAt",
    "firstAttendedAt",
    "lastAttendedAt",
    "attendanceRate",
    "segmentIds",
    "definitionVersion",
    "whatsappStatus",
    "smsStatus",
    "sourceCoverage",
    "projectionVersion",
    "computedAt"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "expectedEventCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "attendedEventCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "cancelledEventCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "noShowCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "importedEventCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "referredRegistrationCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "referredCheckedInCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "referredCheckedIn365DayCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "linkedAccount": {
      "type": "boolean"
    },
    "firstSeenAt": {
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
    "lastSeenAt": {
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
    "firstAttendedAt": {
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
    },
    "lastAttendedAt": {
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
    },
    "attendanceRate": {
      "type": [
        "number",
        "null"
      ],
      "minimum": 0,
      "maximum": 1
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
    },
    "attended30DayCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "attended60DayCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "definitionVersion": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "whatsappStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "optedIn",
        "optedOut"
      ]
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
    "projectionVersion": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "computedAt": {
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
  },
  "definitions": {
    "segmentId": {
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
    },
    "channelStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "optedIn",
        "optedOut"
      ]
    }
  }
} as const;
