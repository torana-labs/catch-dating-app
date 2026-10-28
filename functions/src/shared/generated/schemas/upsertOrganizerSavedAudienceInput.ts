/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const upsertOrganizerSavedAudienceCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/upsert_organizer_saved_audience_payload.schema.json",
  "title": "UpsertOrganizerSavedAudienceCallablePayload",
  "description": "Creates or revision-updates one reusable Customers-owned CRM audience.",
  "x-callable-aliases": [
    "upsertOrganizerSavedAudience"
  ],
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "requestId",
    "scope",
    "name",
    "definition"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "audienceId": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1,
      "maxLength": 180
    },
    "requestId": {
      "type": "string",
      "minLength": 8,
      "maxLength": 120
    },
    "expectedRevision": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "scope": {
      "const": "organizerCrm"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "definition": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "join",
        "predicates"
      ],
      "properties": {
        "join": {
          "type": "string",
          "enum": [
            "all",
            "any"
          ]
        },
        "predicates": {
          "type": "array",
          "minItems": 1,
          "maxItems": 8,
          "items": {
            "oneOf": [
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "segmentId"
                ],
                "properties": {
                  "kind": {
                    "const": "computedSegment"
                  },
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
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "manualTagId"
                ],
                "properties": {
                  "kind": {
                    "const": "manualTag"
                  },
                  "manualTagId": {
                    "type": "string",
                    "pattern": "^[a-f0-9]{32}$"
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "operator",
                  "eventCount"
                ],
                "properties": {
                  "kind": {
                    "const": "attendanceCount"
                  },
                  "operator": {
                    "type": "string",
                    "enum": [
                      "atLeast",
                      "atMost"
                    ]
                  },
                  "eventCount": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "days"
                ],
                "properties": {
                  "kind": {
                    "const": "lastSeenWithinDays"
                  },
                  "days": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 3650
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "intent"
                ],
                "properties": {
                  "kind": {
                    "const": "reachableForIntent"
                  },
                  "intent": {
                    "const": "organizerWhatsappCampaign"
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "formId",
                  "reviewStatus"
                ],
                "properties": {
                  "kind": {
                    "const": "applicationStatus"
                  },
                  "formId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  },
                  "reviewStatus": {
                    "type": "string",
                    "enum": [
                      "submitted",
                      "inReview",
                      "approved",
                      "waitlisted",
                      "declined"
                    ]
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "formId",
                  "versionId",
                  "questionId",
                  "value"
                ],
                "properties": {
                  "kind": {
                    "const": "formAnswer"
                  },
                  "formId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  },
                  "versionId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  },
                  "questionId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  },
                  "value": {
                    "type": [
                      "string",
                      "boolean"
                    ],
                    "minLength": 1,
                    "maxLength": 160
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "eventId"
                ],
                "properties": {
                  "kind": {
                    "const": "attendedEvent"
                  },
                  "eventId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "operator",
                  "currency",
                  "amountMinor",
                  "withinDays"
                ],
                "properties": {
                  "kind": {
                    "const": "spend"
                  },
                  "operator": {
                    "type": "string",
                    "enum": [
                      "atLeast",
                      "atMost"
                    ]
                  },
                  "currency": {
                    "type": "string",
                    "pattern": "^[A-Z]{3}$"
                  },
                  "amountMinor": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000000000
                  },
                  "withinDays": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 1,
                    "maximum": 3650
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "contactIds"
                ],
                "properties": {
                  "kind": {
                    "const": "staticMembers"
                  },
                  "contactIds": {
                    "type": "array",
                    "minItems": 0,
                    "maxItems": 2500,
                    "uniqueItems": true,
                    "items": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 180
                    }
                  }
                }
              },
              {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "segmentIds",
                  "manualTagIds"
                ],
                "properties": {
                  "kind": {
                    "const": "directoryFilters"
                  },
                  "segmentIds": {
                    "type": "array",
                    "maxItems": 12,
                    "uniqueItems": true,
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
                  "manualTagIds": {
                    "type": "array",
                    "maxItems": 20,
                    "uniqueItems": true,
                    "items": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{32}$"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  }
} as const;
