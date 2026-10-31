/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventAttendeeDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_attendees.schema.json",
  "title": "EventAttendeeDocument",
  "description": "Private event-scoped operational attendee stored at eventAttendees/{attendeeId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventAttendees",
  "x-firestore-path": "eventAttendees/{attendeeId}",
  "x-document-id-field": "id",
  "x-owner": "standalone Host roster, Catch-booking projection, public registration, and attendance callables",
  "required": [
    "eventId",
    "organizerId",
    "displayName",
    "searchName",
    "source",
    "status",
    "linkedUid",
    "phoneE164",
    "email",
    "externalReference",
    "arrivalGroup",
    "ticketType",
    "importId",
    "sourceRowId",
    "createdAt",
    "updatedAt",
    "registeredAt",
    "waitlistedAt",
    "checkedInAt",
    "cancelledAt",
    "checkedInBy",
    "linkedAt"
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
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "searchName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "source": {
      "type": "string",
      "enum": [
        "catchBooking",
        "hostImport",
        "hostManual",
        "webOtp",
        "providerSync"
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "invited",
        "registered",
        "waitlisted",
        "checkedIn",
        "cancelled"
      ]
    },
    "linkedUid": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
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
    "cityMarketId": {
      "description": "Private organizer-reported roster city; never a verified participant profile or eligibility input.",
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 120,
          "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
        },
        {
          "type": "null"
        }
      ]
    },
    "citySource": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "hostImport",
        "hostManual",
        null
      ]
    },
    "externalReference": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "arrivalGroup": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "description": "Provider or import-supplied booking/arrival group shared by guests who are expected to arrive together."
    },
    "ticketType": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 120
    },
    "revenueAmountMinor": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "description": "Revenue allocated to this attendee in minor currency units. Organizer-reported and estimated values are not payment verification."
    },
    "revenueCurrency": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Z]{3}$"
    },
    "revenueSource": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "hostImport",
        "hostEstimate",
        "providerOrder",
        "hostAttested",
        null
      ]
    },
    "revenueAllocation": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "perAttendee",
        "sharedOrder",
        null
      ]
    },
    "revenueOrderReference": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "revenueOrderAmountMinor": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0,
      "maximum": 9007199254740991,
      "description": "Original shared-order total before deterministic attendee allocation."
    },
    "importId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 240
    },
    "sourceRowId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 120
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
    "registeredAt": {
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
    "waitlistedAt": {
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
    "checkedInAt": {
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
    "cancelledAt": {
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
    "checkedInBy": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "linkedAt": {
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
    "inviteLinkId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "description": "First eligible opaque invitation link preserved on this operational attendee."
    },
    "inviteCapturedAt": {
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
    "accountabilityRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "description": "Monotonic revision shared by all accountability writers. Missing legacy values read as zero."
    },
    "attendanceRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "description": "Monotonic revision for absolute Host attendance operations. Missing legacy values read as zero."
    },
    "preCheckInStatus": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "invited",
        "registered",
        "waitlisted",
        null
      ],
      "description": "Operational status restored by an absolute undo. Null outside checked-in state."
    },
    "accountabilityResolution": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "returned",
        "departed",
        null
      ],
      "description": "Host-recorded sweep result. It is current only when accountabilityResolvedForCheckInAt equals checkedInAt."
    },
    "accountabilityResolvedForCheckInAt": {
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
    "accountabilityResolvedAt": {
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
    "accountabilityResolvedBy": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "provider": {
      "type": [
        "string",
        "null"
      ],
      "enum": [
        "luma",
        "eventbrite",
        "partiful",
        "posh",
        "bookmyshow",
        "district",
        "sortmyscene",
        "airbnb",
        null
      ],
      "description": "External source that most recently supplied provider-authoritative fields, independent of row creation source."
    },
    "providerConnectionId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "providerGuestId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 240
    },
    "providerSyncedAt": {
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
    "providerDataRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    }
  }
} as const;
