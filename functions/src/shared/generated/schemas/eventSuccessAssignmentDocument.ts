/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessAssignmentDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_assignments.schema.json",
  "title": "EventSuccessAssignmentDocument",
  "description": "Server-owned live guidance assignment stored at eventSuccessAssignments/{eventId_moduleId_uid}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessAssignments",
  "x-firestore-path": "eventSuccessAssignments/{assignmentId}",
  "x-document-id-field": "id",
  "x-owner": "event-success assignment callables",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "eventId",
    "organizerId",
    "uid",
    "moduleId",
    "label",
    "displayTitle",
    "peerUids",
    "source",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "moduleId": {
      "type": "string",
      "enum": [
        "micro_pods",
        "guided_rotations"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "label": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "x-catch-ownership": "callable-owned"
    },
    "displayTitle": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "displaySubtitle": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "peerUids": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 180
      },
      "x-catch-ownership": "callable-owned"
    },
    "unitKind": {
      "type": "string",
      "enum": [
        "wholeGroup",
        "pods",
        "pairs",
        "teams",
        "tables"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "unitIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "unitLabel": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "x-catch-ownership": "callable-owned"
    },
    "layoutUnitId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$",
      "x-catch-ownership": "callable-owned"
    },
    "confirmedLayoutUnitId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$",
      "x-catch-ownership": "callable-owned"
    },
    "whySummary": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "whyCodes": {
      "type": "array",
      "maxItems": 12,
      "items": {
        "type": "string",
        "enum": [
          "host_override",
          "mutual_interest",
          "one_way_interest",
          "questionnaire_match",
          "social_fallback",
          "balanced_group",
          "fresh_peer",
          "repeat_peer",
          "sit_out",
          "pair_slot",
          "pod_slot",
          "table_slot",
          "team_slot",
          "whole_group_slot"
        ]
      },
      "x-catch-ownership": "callable-owned"
    },
    "rotationFairness": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "assignedRoundCount",
        "sitOutRoundCount",
        "uniquePeerCount",
        "repeatPeerCount"
      ],
      "properties": {
        "assignedRoundCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "sitOutRoundCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "uniquePeerCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "repeatPeerCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "sitOutSlots": {
      "type": "array",
      "maxItems": 24,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "roundIndex",
          "label",
          "startsAt",
          "endsAt",
          "whySummary",
          "whyCodes"
        ],
        "properties": {
          "roundIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "startsAt": {
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
          "endsAt": {
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
          "whySummary": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          },
          "whyCodes": {
            "type": "array",
            "maxItems": 12,
            "items": {
              "type": "string",
              "enum": [
                "sit_out"
              ]
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "rotationSlots": {
      "type": "array",
      "maxItems": 24,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "roundIndex",
          "label",
          "startsAt",
          "endsAt",
          "peerUid",
          "compatibility"
        ],
        "properties": {
          "slotId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "roundIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "startsAt": {
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
          "endsAt": {
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
          "peerUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "unitKind": {
            "type": "string",
            "enum": [
              "pairs"
            ]
          },
          "unitIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "resourceUnitId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$"
          },
          "peerCount": {
            "type": "integer",
            "minimum": 1,
            "maximum": 20
          },
          "compatibility": {
            "type": "string",
            "enum": [
              "mutual_interest",
              "one_way_interest",
              "questionnaire_match",
              "social",
              "host_override"
            ]
          },
          "whySummary": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          },
          "whyCodes": {
            "type": "array",
            "maxItems": 12,
            "items": {
              "type": "string",
              "enum": [
                "host_override",
                "mutual_interest",
                "one_way_interest",
                "questionnaire_match",
                "social_fallback",
                "fresh_peer",
                "repeat_peer",
                "pair_slot"
              ]
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "groupRotationSlots": {
      "type": "array",
      "maxItems": 24,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "roundIndex",
          "label",
          "unitLabel",
          "startsAt",
          "endsAt",
          "peerUids",
          "compatibility"
        ],
        "properties": {
          "slotId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "roundIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "unitLabel": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "unitKind": {
            "type": "string",
            "enum": [
              "wholeGroup",
              "pods",
              "pairs",
              "teams",
              "tables"
            ]
          },
          "unitIndex": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "startsAt": {
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
          "endsAt": {
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
          "peerUids": {
            "type": "array",
            "maxItems": 20,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            }
          },
          "peerCount": {
            "type": "integer",
            "minimum": 0,
            "maximum": 20
          },
          "compatibility": {
            "type": "string",
            "enum": [
              "mutual_interest",
              "one_way_interest",
              "questionnaire_match",
              "social",
              "mixed",
              "host_override"
            ]
          },
          "whySummary": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          },
          "whyCodes": {
            "type": "array",
            "maxItems": 12,
            "items": {
              "type": "string",
              "enum": [
                "host_override",
                "mutual_interest",
                "questionnaire_match",
                "social_fallback",
                "balanced_group",
                "fresh_peer",
                "repeat_peer",
                "pair_slot",
                "pod_slot",
                "table_slot",
                "team_slot",
                "whole_group_slot"
              ]
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "source": {
      "type": "string",
      "enum": [
        "server_v1",
        "host_override_v1",
        "server"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "assignmentFeatureAudit": {
      "description": "Opaque, public-safe identity of the feature inputs used by a server assignment. Raw answer and source identifiers remain private.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "algorithmVersion",
        "configHash",
        "inputSnapshotId"
      ],
      "properties": {
        "algorithmVersion": {
          "const": "typed-soft-features-v1"
        },
        "configHash": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "inputSnapshotId": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        }
      },
      "x-catch-ownership": "callable-owned"
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
      "x-catch-ownership": "callable-owned"
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
      "x-catch-ownership": "callable-owned"
    },
    "synthetic": {
      "type": "boolean",
      "description": "Internal demo seed marker used for cleanup and diagnostics."
    },
    "seedPrefix": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed prefix used for cleanup and diagnostics."
    },
    "scenario": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Internal demo seed scenario name used for cleanup and diagnostics."
    },
    "demoOps": {
      "type": "boolean",
      "description": "Internal demo-operations marker used for cleanup and diagnostics."
    },
    "demoOpsId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "description": "Internal demo-operations id used for cleanup and diagnostics."
    },
    "demoOpsCommand": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "description": "Internal demo-operations command name used for cleanup and diagnostics."
    }
  }
} as const;
