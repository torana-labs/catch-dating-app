/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const hostGroupDetailDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/host_group_details.schema.json",
  "title": "HostGroupDetailDocument",
  "description": "Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "hostGroupDetails",
  "x-firestore-path": "hostGroupDetails/{audienceId}",
  "x-document-id-field": "audienceId",
  "x-owner": "Host read model projector",
  "required": [
    "organizerId",
    "audienceId",
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
    "audienceId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "server-only"
    },
    "row": {
      "title": "OrganizerSavedAudienceCallableResponse",
      "description": "Sanitized reusable organizer CRM audience definition.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "organizerId",
        "audienceId",
        "scope",
        "name",
        "status",
        "definition",
        "definitionHash",
        "definitionVersion",
        "revision",
        "lastPreviewMatchCount",
        "lastPreviewReachSummary",
        "lastPreviewAtMillis",
        "createdAtMillis",
        "updatedAtMillis"
      ],
      "properties": {
        "organizerId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "audienceId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "scope": {
          "const": "organizerCrm"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "archived"
          ]
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
        },
        "definitionHash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        },
        "definitionVersion": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000
        },
        "revision": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "lastPreviewMatchCount": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 2500
        },
        "lastPreviewReachSummary": {
          "oneOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "inCatch",
                "automatic",
                "byHand",
                "unavailable"
              ],
              "properties": {
                "inCatch": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 2500
                },
                "automatic": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 2500
                },
                "byHand": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 2500
                },
                "unavailable": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 2500
                }
              }
            }
          ]
        },
        "lastPreviewAtMillis": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "createdAtMillis": {
          "type": "integer",
          "minimum": 0
        },
        "updatedAtMillis": {
          "type": "integer",
          "minimum": 0
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
