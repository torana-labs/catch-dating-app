/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const externalEventDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/external_events.schema.json",
  "title": "ExternalEventDocument",
  "description": "Read-only external event document stored at externalEvents/{eventId}. These records are sourced from events Supply Intake imported for a published organizer and may link to external booking platforms, but they never enable Catch booking, payments, reservations, waitlists, attendance, or schedule locks.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "externalEvents",
  "x-firestore-path": "externalEvents/{eventId}",
  "x-document-id-field": "eventId",
  "x-owner": "organizer intake import tooling after admin review; external source corrections and takedowns are admin-owned",
  "required": [
    "schemaVersion",
    "eventId",
    "canonicalHostId",
    "compatibilityClubId",
    "title",
    "description",
    "startTime",
    "endTime",
    "timezone",
    "meetingPoint",
    "meetingLocation",
    "locationDetails",
    "photoUrl",
    "activity",
    "price",
    "status",
    "publicationStatus",
    "organizerCapabilities",
    "booking",
    "discovery",
    "dedupe",
    "externalSource",
    "review",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 1
    },
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "canonicalHostId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "compatibilityClubId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4000
    },
    "startTime": {
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
    "endTime": {
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
    "timezone": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 80
    },
    "meetingPoint": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
    },
    "meetingLocation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "address",
        "placeId",
        "latitude",
        "longitude",
        "notes"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "address": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 500
        },
        "placeId": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 256
        },
        "latitude": {
          "type": [
            "number",
            "null"
          ],
          "minimum": -90,
          "maximum": 90
        },
        "longitude": {
          "type": [
            "number",
            "null"
          ],
          "minimum": -180,
          "maximum": 180
        },
        "notes": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        }
      }
    },
    "locationDetails": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 1000
    },
    "photoUrl": {
      "anyOf": [
        {
          "type": "string",
          "format": "uri",
          "maxLength": 2048
        },
        {
          "type": "null"
        }
      ]
    },
    "activity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "version",
        "activityKind",
        "interactionModel",
        "source"
      ],
      "properties": {
        "version": {
          "type": "integer",
          "const": 1
        },
        "activityKind": {
          "type": "string",
          "enum": [
            "socialRun",
            "running",
            "walking",
            "pickleball",
            "padel",
            "tennis",
            "badminton",
            "cycling",
            "spinClass",
            "yoga",
            "strengthTraining",
            "pubQuiz",
            "barCrawl",
            "dinner",
            "singlesMixer",
            "openActivity"
          ]
        },
        "interactionModel": {
          "type": "string",
          "enum": [
            "pacePods",
            "pairedRotations",
            "teamRotations",
            "seatedTable",
            "freeFormMixer",
            "hostLedProgram",
            "openFormat"
          ]
        },
        "source": {
          "type": "string",
          "enum": [
            "heuristic",
            "admin",
            "source"
          ]
        }
      }
    },
    "price": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "displayText",
        "parsedPriceInPaise",
        "currency"
      ],
      "properties": {
        "displayText": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "parsedPriceInPaise": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 100000000
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        }
      }
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "cancelled"
      ]
    },
    "publicationStatus": {
      "type": "string",
      "enum": [
        "draft",
        "public",
        "archived",
        "removed"
      ]
    },
    "organizerCapabilities": {
      "title": "OrganizerSupplyCapabilities",
      "description": "Audited snapshot of the attributed organizer's member-affordance ceiling at publication time.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "bookable",
        "paymentsEnabled",
        "waitlistEnabled",
        "hostContactEnabled",
        "claimable",
        "reviewPolicy"
      ],
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "unclaimed_read_only",
            "claimed_managed"
          ]
        },
        "bookable": {
          "type": "boolean"
        },
        "paymentsEnabled": {
          "type": "boolean"
        },
        "waitlistEnabled": {
          "type": "boolean"
        },
        "hostContactEnabled": {
          "type": "boolean"
        },
        "claimable": {
          "type": "boolean"
        },
        "reviewPolicy": {
          "type": "string",
          "enum": [
            "after_event_end",
            "attended_event_only"
          ]
        }
      },
      "oneOf": [
        {
          "properties": {
            "mode": {
              "const": "unclaimed_read_only"
            },
            "bookable": {
              "const": false
            },
            "paymentsEnabled": {
              "const": false
            },
            "waitlistEnabled": {
              "const": false
            },
            "hostContactEnabled": {
              "const": false
            },
            "reviewPolicy": {
              "const": "after_event_end"
            }
          },
          "required": [
            "mode",
            "bookable",
            "paymentsEnabled",
            "waitlistEnabled",
            "hostContactEnabled",
            "reviewPolicy"
          ]
        },
        {
          "properties": {
            "mode": {
              "const": "claimed_managed"
            },
            "bookable": {
              "const": true
            },
            "paymentsEnabled": {
              "const": true
            },
            "waitlistEnabled": {
              "const": true
            },
            "hostContactEnabled": {
              "const": true
            },
            "claimable": {
              "const": false
            },
            "reviewPolicy": {
              "const": "attended_event_only"
            }
          },
          "required": [
            "mode",
            "bookable",
            "paymentsEnabled",
            "waitlistEnabled",
            "hostContactEnabled",
            "claimable",
            "reviewPolicy"
          ]
        }
      ]
    },
    "booking": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "catchBookingEnabled",
        "catchPaymentsEnabled",
        "catchReservationsEnabled",
        "catchWaitlistEnabled",
        "externalLinks"
      ],
      "properties": {
        "mode": {
          "type": "string",
          "const": "external_outbound_only"
        },
        "catchBookingEnabled": {
          "type": "boolean",
          "const": false
        },
        "catchPaymentsEnabled": {
          "type": "boolean",
          "const": false
        },
        "catchReservationsEnabled": {
          "type": "boolean",
          "const": false
        },
        "catchWaitlistEnabled": {
          "type": "boolean",
          "const": false
        },
        "externalLinks": {
          "type": "array",
          "minItems": 1,
          "maxItems": 12,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "platform",
              "url",
              "linkType",
              "sourceEventKey",
              "candidateId",
              "primary"
            ],
            "properties": {
              "platform": {
                "type": "string",
                "enum": [
                  "bookMyShow",
                  "district",
                  "luma",
                  "partiful",
                  "sortMyScene"
                ]
              },
              "url": {
                "type": "string",
                "format": "uri",
                "maxLength": 2048
              },
              "linkType": {
                "type": "string",
                "enum": [
                  "booking_or_event_page",
                  "source_surface"
                ]
              },
              "sourceEventKey": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "candidateId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "primary": {
                "type": "boolean"
              }
            }
          }
        }
      }
    },
    "discovery": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "citySlug",
        "countryCode",
        "availability",
        "manualApprovalRequired",
        "appVisibility"
      ],
      "properties": {
        "citySlug": {
          "anyOf": [
            {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 80,
              "pattern": "^[a-z0-9-]+$"
            },
            {
              "type": "null"
            }
          ]
        },
        "countryCode": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 2,
          "maxLength": 2
        },
        "availability": {
          "type": "string",
          "const": "read_only_external"
        },
        "manualApprovalRequired": {
          "type": "boolean",
          "const": true
        },
        "appVisibility": {
          "type": "string",
          "enum": [
            "hidden",
            "discoverable"
          ],
          "description": "The attributed organizer's app visibility, copied at publication and kept in step when it changes, so app discovery never shows an event whose organizer is hidden in the app. The website applies the organizer's page and search controls itself."
        }
      }
    },
    "dedupe": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "normalizedEventKey",
        "primaryCandidateId",
        "duplicateCandidateIds",
        "conflictPolicy"
      ],
      "properties": {
        "normalizedEventKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        "primaryCandidateId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "duplicateCandidateIds": {
          "type": "array",
          "maxItems": 24,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          }
        },
        "conflictPolicy": {
          "type": "string",
          "const": "single_read_only_event_with_multiple_outbound_links"
        }
      }
    },
    "externalSource": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "candidateId",
        "sourceEventKey",
        "sourceEventId",
        "platform",
        "eventUrl",
        "sourceUrl"
      ],
      "properties": {
        "candidateId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "sourceEventKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "sourceEventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "platform": {
          "type": "string",
          "enum": [
            "bookMyShow",
            "district",
            "luma",
            "partiful",
            "sortMyScene"
          ]
        },
        "eventUrl": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri",
              "maxLength": 2048
            },
            {
              "type": "null"
            }
          ]
        },
        "sourceUrl": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri",
              "maxLength": 2048
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "review": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventReviewBatchId",
        "reviewer",
        "decidedAt",
        "note",
        "importPolicyAcknowledged",
        "ownerSafeCopyReviewed",
        "blockerResolutions"
      ],
      "properties": {
        "eventReviewBatchId": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 180
        },
        "reviewer": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 180
        },
        "decidedAt": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        },
        "note": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        },
        "importPolicyAcknowledged": {
          "type": "boolean"
        },
        "ownerSafeCopyReviewed": {
          "type": "boolean"
        },
        "blockerResolutions": {
          "type": "array",
          "maxItems": 6,
          "items": {
            "title": "ExternalEventBlockerResolution",
            "description": "One explicit, event-scoped resolution or policy-backed waiver for a governed external-event import blocker.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "blockerCode",
              "outcome",
              "policyGapDecisionId",
              "note"
            ],
            "properties": {
              "blockerCode": {
                "type": "string",
                "enum": [
                  "missing_exact_coordinates",
                  "missing_end_time",
                  "missing_location_detail",
                  "requires_event_defaults_policy",
                  "requires_owner_safe_copy_review",
                  "duplicate_normalized_event_key"
                ]
              },
              "outcome": {
                "type": "string",
                "enum": [
                  "resolved",
                  "waived"
                ]
              },
              "policyGapDecisionId": {
                "type": [
                  "string",
                  "null"
                ],
                "minLength": 1,
                "maxLength": 180
              },
              "note": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1000
              }
            },
            "allOf": [
              {
                "if": {
                  "properties": {
                    "outcome": {
                      "const": "waived"
                    }
                  }
                },
                "then": {
                  "properties": {
                    "policyGapDecisionId": {
                      "type": "string"
                    }
                  }
                }
              },
              {
                "if": {
                  "properties": {
                    "outcome": {
                      "const": "resolved"
                    }
                  }
                },
                "then": {
                  "properties": {
                    "policyGapDecisionId": {
                      "type": "null"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    },
    "takedown": {
      "type": [
        "object",
        "null"
      ],
      "additionalProperties": false,
      "required": [
        "removedAt",
        "removedByUid",
        "reason",
        "receiptId"
      ],
      "properties": {
        "removedAt": {
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
        "removedByUid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "reason": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "receiptId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        }
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
