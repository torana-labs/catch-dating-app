/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const organizerIntakeCurationDecisionDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/organizer_intake_curation_decisions.schema.json",
  "title": "OrganizerIntakeCurationDecisionDocument",
  "description": "One manual organizer-intake curation operation stored at organizerIntakeCurationDecisions/{operationId}. Candidate evidence remains in operationRuns and operationWorkItems.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "organizerIntakeCurationDecisions",
  "x-firestore-path": "organizerIntakeCurationDecisions/{operationId}",
  "x-document-id-field": "operationId",
  "x-owner": "adminRecordOrganizerCuration, adminCreateOrganizerDraftFromCandidate and adminApproveOrganizerListing callables",
  "required": [
    "schemaVersion",
    "operationId",
    "operationType",
    "operationStatus",
    "reason",
    "reviewedByUid",
    "reviewedAt",
    "updatedAt"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 1
    },
    "operationId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "operationType": {
      "type": "string",
      "enum": [
        "attach_surface",
        "create_entity_draft",
        "merge_entity",
        "split_surface",
        "suppress_entity",
        "surface_decision"
      ]
    },
    "operationStatus": {
      "type": "string",
      "enum": [
        "active",
        "superseded"
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
    "sourceWorkItemId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "sourceNormalizedKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "publicSlug": {
      "type": "string",
      "minLength": 3,
      "maxLength": 64,
      "pattern": "^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$",
      "description": "Public route slug reserved when a candidate becomes an organizer draft. It is intentionally separate from entityId."
    },
    "fieldProvenance": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "field",
          "artifactId",
          "contentHash",
          "locator",
          "extractedBy",
          "extractorVersion",
          "confidence"
        ],
        "properties": {
          "field": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "artifactId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
          },
          "contentHash": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          },
          "locator": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 1000
          },
          "extractedBy": {
            "type": "string",
            "enum": [
              "deterministic",
              "model",
              "human"
            ]
          },
          "extractorVersion": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "confidence": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "description": "Source artifact lineage for each field projected into the organizer draft."
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
                  "seedClub",
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
    },
    "reviewedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "reviewedAt": {
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
                  "seedClub",
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
            "seedClub",
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
