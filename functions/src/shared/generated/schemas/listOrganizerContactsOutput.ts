/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const listOrganizerContactsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/list_organizer_contacts_response.schema.json",
  "title": "ListOrganizerContactsCallableResponse",
  "description": "Safe manager-only organizer contact rows and opaque pagination state.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "contacts",
    "nextCursor",
    "matchCount",
    "matchCountCoverage",
    "sourceCoverage",
    "projectionVersion"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "contacts": {
      "type": "array",
      "maxItems": 100,
      "items": {
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
        }
      }
    },
    "nextCursor": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 1000
    },
    "matchCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "matchCountCoverage": {
      "type": "string",
      "enum": [
        "exact",
        "atLeast"
      ]
    },
    "manualTagVocabulary": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
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
    "sourceCoverage": {
      "type": "string",
      "enum": [
        "exact",
        "partial"
      ]
    },
    "projectionVersion": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    }
  },
  "definitions": {
    "contact": {
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
      }
    }
  }
} as const;
