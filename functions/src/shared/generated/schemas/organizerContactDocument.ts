/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerContactDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_contacts.schema.json",
  "title": "OrganizerContactDocument",
  "description": "Server-owned organizer-scoped contact projection. It is not a Consumer profile and may contain restricted operational contact data.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerContacts",
  "x-firestore-path": "organizerContacts/{contactId}",
  "x-document-id-field": "contactId",
  "x-owner": "organizer audience projection and manager-only CRM callables",
  "required": [
    "organizerId",
    "displayName",
    "searchName",
    "linkedUid",
    "phoneE164",
    "email",
    "identityState",
    "identityConfidence",
    "primarySource",
    "ambiguousCandidateContactIds",
    "firstSeenAt",
    "lastSeenAt",
    "sourceCount",
    "whatsappStatus",
    "smsStatus",
    "revision",
    "mergedIntoContactId",
    "createdAt",
    "updatedAt",
    "deletedAt"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "displayName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "server-only"
    },
    "displayNameOverride": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "server-only",
      "description": "Organizer-scoped label correction. It never changes the Consumer profile or a provider/roster source row."
    },
    "searchName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "server-only"
    },
    "linkedUid": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "phoneE164": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^\\+[1-9][0-9]{7,14}$",
      "x-catch-ownership": "server-only"
    },
    "email": {
      "type": [
        "string",
        "null"
      ],
      "format": "email",
      "maxLength": 320,
      "x-catch-ownership": "server-only"
    },
    "identityState": {
      "type": "string",
      "enum": [
        "unlinked",
        "verified",
        "ambiguous",
        "merged"
      ],
      "x-catch-ownership": "server-only"
    },
    "identityConfidence": {
      "type": "string",
      "enum": [
        "eventOnly",
        "proposed",
        "verified"
      ],
      "x-catch-ownership": "server-only"
    },
    "primarySource": {
      "type": "string",
      "enum": [
        "catchBooking",
        "hostImport",
        "hostManual",
        "webOtp",
        "providerSync",
        "hostForm"
      ],
      "x-catch-ownership": "server-only"
    },
    "ambiguousCandidateContactIds": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      },
      "x-catch-ownership": "server-only"
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
      },
      "x-catch-ownership": "server-only"
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
      },
      "x-catch-ownership": "server-only"
    },
    "sourceCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000,
      "x-catch-ownership": "server-only"
    },
    "whatsappStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "optedIn",
        "optedOut"
      ],
      "x-catch-ownership": "server-only"
    },
    "smsStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "optedIn",
        "optedOut"
      ],
      "x-catch-ownership": "server-only"
    },
    "manualTagIds": {
      "type": "array",
      "maxItems": 5,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "pattern": "^[a-f0-9]{32}$"
      },
      "x-catch-ownership": "server-only",
      "description": "Organizer-authored manual CRM tag ids. These are distinct from computed segment ids in organizerContactTraits."
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "server-only"
    },
    "mergedIntoContactId": {
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
    "deletedAt": {
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
    "hiddenAt": {
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
      "x-catch-ownership": "server-only",
      "description": "Organizer-requested CRM hiding. Operational attendee and audit facts remain intact."
    },
    "hiddenBy": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "hiddenTraitSnapshot": {
      "anyOf": [
        {
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
        },
        {
          "type": "null"
        }
      ],
      "x-catch-ownership": "server-only",
      "description": "Bounded organizer-audience contribution snapshot used only to restore a hidden contact without recomputing private event history."
    }
  },
  "definitions": {
    "channelStatus": {
      "type": "string",
      "enum": [
        "unknown",
        "optedIn",
        "optedOut"
      ],
      "x-catch-ownership": "server-only"
    }
  }
} as const;
