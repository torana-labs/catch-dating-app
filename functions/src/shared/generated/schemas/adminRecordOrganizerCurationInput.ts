/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminRecordOrganizerCurationCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/admin_record_organizer_curation_payload.schema.json",
  "title": "AdminRecordOrganizerCurationCallablePayload",
  "description": "Callable payload accepted by adminRecordOrganizerCuration. This records one durable low-volume manual organizer-intake curation operation in Firestore.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "operationType",
    "reason"
  ],
  "properties": {
    "operationId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "operationType": {
      "type": "string",
      "enum": [
        "attach_surface",
        "merge_entity",
        "split_surface",
        "suppress_entity",
        "surface_decision"
      ]
    },
    "entityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sourceEntityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "targetEntityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "surfaceId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "newEntityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sourceCandidateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
    },
    "decision": {
      "type": "string",
      "enum": [
        "accept_primary",
        "accept_secondary",
        "reject_wrong_entity",
        "mark_ambiguous",
        "mark_historical"
      ]
    },
    "surface": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "surfaceId",
        "platform",
        "surfaceKind",
        "url",
        "normalizedKey",
        "role",
        "status",
        "confidence",
        "crawl",
        "evidenceRefs",
        "notes"
      ],
      "properties": {
        "surfaceId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "platform": {
          "type": "string",
          "enum": [
            "bookMyShow",
            "district",
            "instagram",
            "linkedin",
            "luma",
            "news",
            "officialWebsite",
            "partiful",
            "sortMyScene",
            "userReport",
            "other"
          ]
        },
        "surfaceKind": {
          "type": "string",
          "enum": [
            "eventListing",
            "eventCalendar",
            "organizerProfile",
            "personProfile",
            "press",
            "socialProfile",
            "website",
            "wrongEntity"
          ]
        },
        "url": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri"
            },
            {
              "type": "null"
            }
          ]
        },
        "normalizedKey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 240
        },
        "role": {
          "type": "string",
          "enum": [
            "primary",
            "secondary",
            "backup",
            "historical",
            "ambiguous",
            "rejected"
          ]
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "candidate",
            "ambiguous",
            "historical",
            "rejected"
          ]
        },
        "confidence": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "entityMatch",
            "ownership",
            "city"
          ],
          "properties": {
            "entityMatch": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "ownership": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "city": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            }
          }
        },
        "crawl": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "eventDiscoveryStatus",
            "policy",
            "supportsEventExtraction"
          ],
          "properties": {
            "eventDiscoveryStatus": {
              "type": "string",
              "enum": [
                "disabled",
                "candidate",
                "approved",
                "paused"
              ]
            },
            "policy": {
              "type": "string",
              "enum": [
                "manualOnly",
                "blocked",
                "apiPreferred"
              ]
            },
            "supportsEventExtraction": {
              "type": "boolean"
            }
          }
        },
        "evidenceRefs": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "ref",
              "description"
            ],
            "properties": {
              "type": {
                "type": "string",
                "enum": [
                  "hostDiscoveryRun",
                  "seedOrganizer",
                  "userReportedSearchResult",
                  "manualNote"
                ]
              },
              "ref": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 240
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 400
              }
            }
          }
        },
        "notes": {
          "type": "string",
          "maxLength": 500
        }
      }
    },
    "reason": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "definitions": {
    "urlOrNull": {
      "anyOf": [
        {
          "type": "string",
          "format": "uri"
        },
        {
          "type": "null"
        }
      ]
    },
    "surface": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "surfaceId",
        "platform",
        "surfaceKind",
        "url",
        "normalizedKey",
        "role",
        "status",
        "confidence",
        "crawl",
        "evidenceRefs",
        "notes"
      ],
      "properties": {
        "surfaceId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "platform": {
          "type": "string",
          "enum": [
            "bookMyShow",
            "district",
            "instagram",
            "linkedin",
            "luma",
            "news",
            "officialWebsite",
            "partiful",
            "sortMyScene",
            "userReport",
            "other"
          ]
        },
        "surfaceKind": {
          "type": "string",
          "enum": [
            "eventListing",
            "eventCalendar",
            "organizerProfile",
            "personProfile",
            "press",
            "socialProfile",
            "website",
            "wrongEntity"
          ]
        },
        "url": {
          "anyOf": [
            {
              "type": "string",
              "format": "uri"
            },
            {
              "type": "null"
            }
          ]
        },
        "normalizedKey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 240
        },
        "role": {
          "type": "string",
          "enum": [
            "primary",
            "secondary",
            "backup",
            "historical",
            "ambiguous",
            "rejected"
          ]
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "candidate",
            "ambiguous",
            "historical",
            "rejected"
          ]
        },
        "confidence": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "entityMatch",
            "ownership",
            "city"
          ],
          "properties": {
            "entityMatch": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "ownership": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "city": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            }
          }
        },
        "crawl": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "eventDiscoveryStatus",
            "policy",
            "supportsEventExtraction"
          ],
          "properties": {
            "eventDiscoveryStatus": {
              "type": "string",
              "enum": [
                "disabled",
                "candidate",
                "approved",
                "paused"
              ]
            },
            "policy": {
              "type": "string",
              "enum": [
                "manualOnly",
                "blocked",
                "apiPreferred"
              ]
            },
            "supportsEventExtraction": {
              "type": "boolean"
            }
          }
        },
        "evidenceRefs": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "ref",
              "description"
            ],
            "properties": {
              "type": {
                "type": "string",
                "enum": [
                  "hostDiscoveryRun",
                  "seedOrganizer",
                  "userReportedSearchResult",
                  "manualNote"
                ]
              },
              "ref": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 240
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 400
              }
            }
          }
        },
        "notes": {
          "type": "string",
          "maxLength": 500
        }
      }
    },
    "evidenceRef": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "ref",
        "description"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "hostDiscoveryRun",
            "seedOrganizer",
            "userReportedSearchResult",
            "manualNote"
          ]
        },
        "ref": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 240
        },
        "description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 400
        }
      }
    }
  }
} as const;
