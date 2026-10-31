/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventSuccessPlanDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_success_plans.schema.json",
  "title": "EventSuccessPlanDocument",
  "description": "Host-owned live event-success setup stored at eventSuccessPlans/{eventId}. The event id is the document id and is also stored for cheap validation and reads.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventSuccessPlans",
  "x-firestore-path": "eventSuccessPlans/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "organizer manager direct write; event participants read",
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
    "playbookId",
    "selectedModuleIds",
    "targetAttendeeCount",
    "hostGoal",
    "wingmanRequestsEnabled",
    "contextualOpenersEnabled",
    "activeStepIndex",
    "status",
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
    "layoutId": {
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$",
      "x-catch-ownership": "callable-owned"
    },
    "affinityConstraints": {
      "type": "array",
      "maxItems": 300,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "aUid",
          "bUid",
          "value",
          "scope"
        ],
        "properties": {
          "aUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "bUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "value": {
            "type": "string",
            "enum": [
              "mustPair",
              "mustSplit",
              "avoidRepeat",
              "neutral"
            ]
          },
          "scope": {
            "type": "string",
            "enum": [
              "thisRound",
              "pinned"
            ]
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "spatialOverrides": {
      "type": "array",
      "maxItems": 300,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "uid",
          "targetPeerUid",
          "layoutUnitId",
          "scope"
        ],
        "properties": {
          "uid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "targetPeerUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "layoutUnitId": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$"
          },
          "scope": {
            "type": "string",
            "enum": [
              "thisRound",
              "pinned"
            ]
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "playbookId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-catch-ownership": "callable-owned"
    },
    "selectedModuleIds": {
      "type": "array",
      "maxItems": 24,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "x-catch-ownership": "callable-owned"
    },
    "targetAttendeeCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "x-catch-ownership": "callable-owned"
    },
    "structureConfig": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unitKind",
        "unitSize",
        "revealCountdownSeconds"
      ],
      "properties": {
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
        "unitSize": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000
        },
        "unitCount": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 200
        },
        "rotationIntervalMinutes": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 5,
          "maximum": 180
        },
        "topology": {
          "type": "string",
          "enum": [
            "set",
            "sequence",
            "adjacency"
          ]
        },
        "resourceCapacity": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "concurrentUnits",
                "resourceLabelId",
                "seatsPerUnit"
              ],
              "properties": {
                "concurrentUnits": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1,
                  "maximum": 200
                },
                "resourceLabelId": {
                  "type": "string",
                  "enum": [
                    "court",
                    "table",
                    "lane",
                    "board"
                  ]
                },
                "seatsPerUnit": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1,
                  "maximum": 1000
                }
              }
            },
            {
              "type": "null"
            }
          ]
        },
        "revealCountdownSeconds": {
          "type": "integer",
          "minimum": 0,
          "maximum": 60
        },
        "rotationRepeatStrategy": {
          "type": "string",
          "enum": [
            "avoid",
            "allowWhenExhausted"
          ]
        },
        "maxPairMeetings": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10
        },
        "balanceActivityAttributes": {
          "type": "array",
          "maxItems": 8,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "paceBand",
              "skillBand",
              "roleBand"
            ]
          }
        },
        "clusterActivityAttributes": {
          "type": "array",
          "maxItems": 8,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "paceBand",
              "skillBand",
              "roleBand"
            ]
          }
        }
      },
      "allOf": [
        {
          "if": {
            "required": [
              "resourceCapacity"
            ],
            "properties": {
              "resourceCapacity": {
                "type": "object",
                "required": [
                  "seatsPerUnit"
                ],
                "properties": {
                  "seatsPerUnit": {
                    "type": "integer"
                  }
                }
              }
            }
          },
          "then": {
            "required": [
              "topology"
            ],
            "properties": {
              "topology": {
                "const": "adjacency"
              }
            }
          }
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "assignmentFeatureRules": {
      "type": "array",
      "maxItems": 8,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "featureId",
          "formId",
          "versionId",
          "questionId",
          "transformVersion",
          "kind",
          "mode",
          "weight"
        ],
        "properties": {
          "featureId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
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
          "transformVersion": {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          "kind": {
            "enum": [
              "category",
              "set",
              "number",
              "ordinal"
            ]
          },
          "mode": {
            "enum": [
              "preferSimilar",
              "preferDifferent",
              "balanceAcrossGroups"
            ]
          },
          "weight": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "optionIds": {
            "type": "array",
            "maxItems": 40,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            }
          },
          "scoreByOptionId": {
            "type": "object",
            "maxProperties": 40,
            "propertyNames": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "additionalProperties": {
              "type": "number"
            }
          },
          "minimum": {
            "type": "number"
          },
          "maximum": {
            "type": "number"
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "assignmentFeatureRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "assignmentFeatureRequestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "assignmentFeatureConfigHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "callable-owned"
    },
    "hostGoal": {
      "type": "string",
      "maxLength": 300,
      "x-catch-ownership": "callable-owned"
    },
    "wingmanRequestsEnabled": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "contextualOpenersEnabled": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "compatibilityAffectsRanking": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "questionnaireConfig": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "templateId"
      ],
      "properties": {
        "templateId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "customTitle": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "customQuestions": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "prompt",
              "options"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "prompt": {
                "type": "string",
                "minLength": 1,
                "maxLength": 140
              },
              "options": {
                "type": "array",
                "minItems": 2,
                "maxItems": 5,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "id",
                    "label"
                  ],
                  "properties": {
                    "id": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 120
                    },
                    "label": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 80
                    }
                  }
                }
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "conversationGraphConsentMode": {
      "type": "string",
      "enum": [
        "optIn",
        "optOut"
      ],
      "description": "Whether assigned attendees begin unselected or preselected in the end-of-event conversation graph. Missing legacy values resolve to optIn.",
      "x-catch-ownership": "callable-owned"
    },
    "activeStepIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "liveControlRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "assignmentDraftRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "publishedRotationRoundIndex": {
      "type": "integer",
      "minimum": -1,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "publishedRevealRoundIndex": {
      "type": "integer",
      "minimum": -1,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "setup",
        "live",
        "complete"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "revealStatus": {
      "type": "string",
      "enum": [
        "idle",
        "countingDown",
        "revealed"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "activeRevealRoundIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
    },
    "revealStartedAt": {
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
      "x-catch-ownership": "callable-owned"
    },
    "attendeePrompt": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 300,
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
    "frozenAt": {
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
      "x-catch-ownership": "callable-owned"
    },
    "completedAt": {
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
