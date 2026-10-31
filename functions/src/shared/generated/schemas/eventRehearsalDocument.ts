/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventRehearsalDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/event_rehearsals.schema.json",
  "title": "EventRehearsalDocument",
  "description": "Server-owned isolated Host rehearsal session stored at eventRehearsals/{sessionId}.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "eventRehearsals",
  "x-firestore-path": "eventRehearsals/{sessionId}",
  "x-document-id-field": "id",
  "x-owner": "event rehearsal callables",
  "required": [
    "organizerId",
    "ownerUid",
    "sourceEventId",
    "sourceEventRevision",
    "publicRehearsalId",
    "viewerTokenHash",
    "scenarioId",
    "seed",
    "actorCount",
    "actionCount",
    "status",
    "setup",
    "setupRevision",
    "runtimeRevision",
    "activeStepIndex",
    "virtualStartedAt",
    "virtualNow",
    "faultId",
    "faultConsumed",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "completedAt"
  ],
  "properties": {
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "ownerUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "sourceEventId": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "sourceEventRevision": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "publicRehearsalId": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{20,80}$",
      "x-catch-ownership": "callable-owned"
    },
    "viewerTokenHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "callable-owned"
    },
    "scenarioId": {
      "type": "string",
      "enum": [
        "smoothRun",
        "lateAndNoShow",
        "earlyExitAndReturn",
        "rosterAndCapacity",
        "walkInAndAmbiguousClaim",
        "privacyAndKeepApart",
        "lowConnectivity",
        "concurrentHosts",
        "revealInterrupted",
        "externalProfiles",
        "accountabilitySweep"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "seed": {
      "type": "integer",
      "minimum": 1,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "actorCount": {
      "type": "integer",
      "minimum": 2,
      "maximum": 50,
      "x-catch-ownership": "callable-owned"
    },
    "actionCount": {
      "type": "integer",
      "minimum": 0,
      "maximum": 500,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "draft",
        "ready",
        "running",
        "paused",
        "complete",
        "expired"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "setup": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "title",
        "locationName",
        "durationMinutes",
        "hostGoal",
        "attendeePrompt",
        "moduleIds"
      ],
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "locationName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "durationMinutes": {
          "type": "integer",
          "minimum": 30,
          "maximum": 360
        },
        "hostGoal": {
          "type": "string",
          "minLength": 1,
          "maxLength": 300
        },
        "attendeePrompt": {
          "type": "string",
          "minLength": 1,
          "maxLength": 320
        },
        "moduleIds": {
          "type": "array",
          "minItems": 1,
          "maxItems": 8,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": [
              "arrival",
              "firstHello",
              "pods",
              "rotations",
              "conversationCues",
              "reveal",
              "afterglow",
              "accountability"
            ]
          }
        },
        "unitOutcome": {
          "type": "string",
          "enum": [
            "none",
            "completion",
            "score",
            "rank"
          ]
        },
        "movementSimulation": {
          "type": "object",
          "additionalProperties": false,
          "description": "Frozen, synthetic-only movement truth used by dress rehearsal. It never reads or writes a real person's live position.",
          "required": [
            "itinerary",
            "routePlan",
            "livePositions",
            "lateArrivalGuidance"
          ],
          "properties": {
            "itinerary": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "description": "One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.",
                "required": [
                  "id",
                  "kind",
                  "offsetMinutes",
                  "title"
                ],
                "properties": {
                  "id": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 80,
                    "pattern": "^[A-Za-z0-9_-]+$"
                  },
                  "kind": {
                    "type": "string",
                    "enum": [
                      "gather",
                      "activity",
                      "stop",
                      "break",
                      "transition",
                      "finish"
                    ]
                  },
                  "offsetMinutes": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 1440
                  },
                  "durationMinutes": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 1,
                    "maximum": 1440
                  },
                  "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  },
                  "description": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 500
                  },
                  "location": {
                    "anyOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "description": "Canonical meeting location selected from Google Places or a manually pinned map coordinate.",
                        "required": [
                          "name",
                          "latitude",
                          "longitude"
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
                            "type": "number",
                            "minimum": -90,
                            "maximum": 90
                          },
                          "longitude": {
                            "type": "number",
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
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "routeDistanceMeters": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 0,
                    "maximum": 1000000
                  }
                }
              }
            },
            "routePlan": {
              "anyOf": [
                {
                  "type": "null"
                },
                {
                  "type": "object",
                  "description": "Composable operations for an event that moves through a route. Activity kind remains the broader format authority.",
                  "additionalProperties": false,
                  "required": [
                    "version",
                    "movementMode",
                    "routeShape",
                    "groupStrategy",
                    "stopCadence",
                    "stopKinds",
                    "roleKinds"
                  ],
                  "properties": {
                    "version": {
                      "type": "integer",
                      "enum": [
                        1,
                        2
                      ]
                    },
                    "movementMode": {
                      "type": "string",
                      "enum": [
                        "run",
                        "walk",
                        "ride",
                        "mixed"
                      ]
                    },
                    "routeShape": {
                      "type": "string",
                      "enum": [
                        "loop",
                        "outAndBack",
                        "pointToPoint"
                      ]
                    },
                    "groupStrategy": {
                      "type": "string",
                      "enum": [
                        "together",
                        "paceGroups",
                        "selfDirected"
                      ]
                    },
                    "stopCadence": {
                      "type": "string",
                      "enum": [
                        "continuous",
                        "flexibleStops",
                        "hostedStops"
                      ]
                    },
                    "stopKinds": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 7,
                      "uniqueItems": true,
                      "items": {
                        "type": "string",
                        "enum": [
                          "water",
                          "regroup",
                          "venue",
                          "photoSpot",
                          "viewpoint",
                          "hazard",
                          "turnaround"
                        ]
                      }
                    },
                    "roleKinds": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 6,
                      "uniqueItems": true,
                      "items": {
                        "type": "string",
                        "enum": [
                          "routeLead",
                          "sweep",
                          "pacer",
                          "stopHost",
                          "marshal",
                          "photographer"
                        ]
                      }
                    },
                    "path": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 500,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "latitude",
                          "longitude"
                        ],
                        "properties": {
                          "latitude": {
                            "type": "number",
                            "minimum": -90,
                            "maximum": 90
                          },
                          "longitude": {
                            "type": "number",
                            "minimum": -180,
                            "maximum": 180
                          }
                        }
                      }
                    },
                    "paceGroups": {
                      "type": "array",
                      "maxItems": 12,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "id",
                          "label",
                          "sortOrder"
                        ],
                        "properties": {
                          "id": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80,
                            "pattern": "^[A-Za-z0-9_-]+$"
                          },
                          "label": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80
                          },
                          "targetPaceSecondsPerKm": {
                            "type": [
                              "integer",
                              "null"
                            ],
                            "minimum": 120,
                            "maximum": 1800
                          },
                          "sortOrder": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 1000
                          }
                        }
                      }
                    },
                    "liveTrackingPolicy": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "mode",
                        "staleAfterSeconds",
                        "retentionMinutes"
                      ],
                      "properties": {
                        "mode": {
                          "type": "string",
                          "enum": [
                            "disabled",
                            "hostOnly",
                            "authorizedOperators"
                          ]
                        },
                        "staleAfterSeconds": {
                          "type": "integer",
                          "minimum": 30,
                          "maximum": 600
                        },
                        "retentionMinutes": {
                          "type": "integer",
                          "minimum": 5,
                          "maximum": 1440
                        }
                      }
                    }
                  }
                }
              ]
            },
            "livePositions": {
              "type": "array",
              "maxItems": 2,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "role",
                  "latitude",
                  "longitude",
                  "recordedOffsetMinutes"
                ],
                "properties": {
                  "role": {
                    "type": "string",
                    "enum": [
                      "host",
                      "operator"
                    ]
                  },
                  "latitude": {
                    "type": "number",
                    "minimum": -90,
                    "maximum": 90
                  },
                  "longitude": {
                    "type": "number",
                    "minimum": -180,
                    "maximum": 180
                  },
                  "recordedOffsetMinutes": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 360
                  }
                }
              }
            },
            "lateArrivalGuidance": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 320
            }
          }
        },
        "eventFormat": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "version",
            "activityKind",
            "interactionModel"
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
            "customActivityLabel": {
              "type": "string",
              "minLength": 1,
              "maxLength": 80
            },
            "defaultPlaybookId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "defaultModuleIds": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "maxItems": 30,
              "uniqueItems": true
            },
            "eventSuccessPrimitives": {
              "type": "object",
              "additionalProperties": false,
              "description": "Optional event-success behavior primitives for custom or unsupported activity formats. These fields translate a saved event format into the small set of primitives event success can reason about.",
              "properties": {
                "phoneAvailability": {
                  "type": "string",
                  "enum": [
                    "continuous",
                    "plannedPauses",
                    "arrivalAndPostEventOnly",
                    "hostOnlyLive",
                    "noneDuringActivity"
                  ]
                },
                "rotationSuitability": {
                  "type": "string",
                  "enum": [
                    "none",
                    "plannedBreaks",
                    "continuousRounds"
                  ]
                },
                "assignmentAlgorithm": {
                  "type": "string",
                  "enum": [
                    "none",
                    "pacePods",
                    "socialPods",
                    "pairRotations",
                    "teamBalancer",
                    "tableSeating"
                  ]
                },
                "compatibilityPolicy": {
                  "type": "string",
                  "enum": [
                    "none",
                    "socialCohortBalance",
                    "mutualInterestOnly",
                    "questionnaireClueOnly"
                  ]
                },
                "matchingObjective": {
                  "type": "string",
                  "enum": [
                    "coverage",
                    "romantic",
                    "affinity",
                    "novelty",
                    "balance",
                    "spread"
                  ]
                },
                "unitOutcome": {
                  "type": "string",
                  "enum": [
                    "none",
                    "completion",
                    "score",
                    "rank"
                  ]
                },
                "accountability": {
                  "type": "string",
                  "enum": [
                    "none",
                    "rollCall",
                    "sweep"
                  ]
                },
                "durationShape": {
                  "type": "string",
                  "enum": [
                    "continuous",
                    "rounds",
                    "courses",
                    "segments"
                  ]
                }
              }
            },
            "activityDetails": {
              "type": "object",
              "additionalProperties": true,
              "properties": {
                "routePlan": {
                  "type": "object",
                  "description": "Composable operations for an event that moves through a route. Activity kind remains the broader format authority.",
                  "additionalProperties": false,
                  "required": [
                    "version",
                    "movementMode",
                    "routeShape",
                    "groupStrategy",
                    "stopCadence",
                    "stopKinds",
                    "roleKinds"
                  ],
                  "properties": {
                    "version": {
                      "type": "integer",
                      "enum": [
                        1,
                        2
                      ]
                    },
                    "movementMode": {
                      "type": "string",
                      "enum": [
                        "run",
                        "walk",
                        "ride",
                        "mixed"
                      ]
                    },
                    "routeShape": {
                      "type": "string",
                      "enum": [
                        "loop",
                        "outAndBack",
                        "pointToPoint"
                      ]
                    },
                    "groupStrategy": {
                      "type": "string",
                      "enum": [
                        "together",
                        "paceGroups",
                        "selfDirected"
                      ]
                    },
                    "stopCadence": {
                      "type": "string",
                      "enum": [
                        "continuous",
                        "flexibleStops",
                        "hostedStops"
                      ]
                    },
                    "stopKinds": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 7,
                      "uniqueItems": true,
                      "items": {
                        "type": "string",
                        "enum": [
                          "water",
                          "regroup",
                          "venue",
                          "photoSpot",
                          "viewpoint",
                          "hazard",
                          "turnaround"
                        ]
                      }
                    },
                    "roleKinds": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 6,
                      "uniqueItems": true,
                      "items": {
                        "type": "string",
                        "enum": [
                          "routeLead",
                          "sweep",
                          "pacer",
                          "stopHost",
                          "marshal",
                          "photographer"
                        ]
                      }
                    },
                    "path": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 500,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "latitude",
                          "longitude"
                        ],
                        "properties": {
                          "latitude": {
                            "type": "number",
                            "minimum": -90,
                            "maximum": 90
                          },
                          "longitude": {
                            "type": "number",
                            "minimum": -180,
                            "maximum": 180
                          }
                        }
                      }
                    },
                    "paceGroups": {
                      "type": "array",
                      "maxItems": 12,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "id",
                          "label",
                          "sortOrder"
                        ],
                        "properties": {
                          "id": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80,
                            "pattern": "^[A-Za-z0-9_-]+$"
                          },
                          "label": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80
                          },
                          "targetPaceSecondsPerKm": {
                            "type": [
                              "integer",
                              "null"
                            ],
                            "minimum": 120,
                            "maximum": 1800
                          },
                          "sortOrder": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 1000
                          }
                        }
                      }
                    },
                    "liveTrackingPolicy": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "mode",
                        "staleAfterSeconds",
                        "retentionMinutes"
                      ],
                      "properties": {
                        "mode": {
                          "type": "string",
                          "enum": [
                            "disabled",
                            "hostOnly",
                            "authorizedOperators"
                          ]
                        },
                        "staleAfterSeconds": {
                          "type": "integer",
                          "minimum": 30,
                          "maximum": 600
                        },
                        "retentionMinutes": {
                          "type": "integer",
                          "minimum": 5,
                          "maximum": 1440
                        }
                      }
                    }
                  }
                },
                "publicDetails": {
                  "type": "object",
                  "description": "Optional host-authored notes for public event pages. Blank notes are omitted.",
                  "additionalProperties": true,
                  "properties": {
                    "requirements": {
                      "type": "string",
                      "maxLength": 2000
                    },
                    "accessibility": {
                      "type": "string",
                      "maxLength": 2000
                    },
                    "included": {
                      "type": "string",
                      "maxLength": 2000
                    }
                  }
                }
              }
            }
          }
        },
        "successDefaults": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "enabled": {
              "type": "boolean"
            },
            "layoutId": {
              "type": [
                "string",
                "null"
              ],
              "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
            },
            "playbookId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "selectedModuleIds": {
              "type": "array",
              "maxItems": 24,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            },
            "moduleSelectionConfigured": {
              "type": "boolean"
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
              ]
            },
            "hostGoal": {
              "type": "string",
              "maxLength": 300
            },
            "wingmanRequestsEnabled": {
              "type": "boolean"
            },
            "contextualOpenersEnabled": {
              "type": "boolean"
            },
            "compatibilityAffectsRanking": {
              "type": "boolean"
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
              }
            },
            "attendeePrompt": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 300
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "setupRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "runtimeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "activeStepIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 8,
      "x-catch-ownership": "callable-owned"
    },
    "virtualStartedAt": {
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
    "virtualNow": {
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
    "faultId": {
      "type": "string",
      "enum": [
        "none",
        "latency",
        "oneShotFailure",
        "listenerDisconnect",
        "staleRevision",
        "duplicateDelivery",
        "legacyFixture",
        "reducedMotion",
        "lowBandwidth"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "faultConsumed": {
      "type": "boolean",
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
    "expiresAt": {
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
    "staff": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "clockId",
        "revision",
        "operators"
      ],
      "properties": {
        "clockId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "operators": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "operatorId",
              "displayName",
              "duties"
            ],
            "properties": {
              "operatorId": {
                "type": "string",
                "pattern": "^practice-staff:[A-Za-z0-9_-]{1,60}$"
              },
              "displayName": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "duties": {
                "type": "array",
                "maxItems": 20,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "groupId",
                    "duty",
                    "expiresAtMillis",
                    "sourceHash",
                    "grantedBy",
                    "grantedAtMillis"
                  ],
                  "properties": {
                    "groupId": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 160,
                      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                    },
                    "duty": {
                      "enum": [
                        "lead",
                        "pacer",
                        "sweep"
                      ]
                    },
                    "expiresAtMillis": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "sourceHash": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{64}$"
                    },
                    "grantedBy": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 180
                    },
                    "grantedAtMillis": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
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
    "assistanceSettings": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "clockId",
        "runtime",
        "preferences"
      ],
      "properties": {
        "clockId": {
          "type": "string",
          "pattern": "^clock:[a-f0-9]{64}$"
        },
        "runtime": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "status",
                "configuration"
              ],
              "properties": {
                "status": {
                  "enum": [
                    "enabled",
                    "paused"
                  ]
                },
                "configuration": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "routes",
                    "deliveryPolicy",
                    "responseDeadline",
                    "outcomes"
                  ],
                  "properties": {
                    "routes": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 3,
                      "uniqueItems": true,
                      "items": {
                        "type": "string",
                        "enum": [
                          "catchEventSms",
                          "catchEventRcs",
                          "organizerEventWhatsapp"
                        ]
                      }
                    },
                    "deliveryPolicy": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "maxAttempts",
                        "maxAttemptsPerRoute",
                        "minimumRetrySeconds"
                      ],
                      "properties": {
                        "maxAttempts": {
                          "type": "integer",
                          "minimum": 1,
                          "maximum": 6
                        },
                        "maxAttemptsPerRoute": {
                          "type": "integer",
                          "minimum": 1,
                          "maximum": 3
                        },
                        "minimumRetrySeconds": {
                          "type": "integer",
                          "minimum": 1,
                          "maximum": 3600
                        }
                      }
                    },
                    "responseDeadline": {
                      "anyOf": [
                        {
                          "type": "integer",
                          "minimum": 0,
                          "maximum": 9007199254740991
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "laterChoices": {
                      "type": "array",
                      "maxItems": 17,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "label",
                          "target"
                        ],
                        "properties": {
                          "label": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80
                          },
                          "target": {
                            "anyOf": [
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "kind",
                                  "placeId",
                                  "lateEntry"
                                ],
                                "properties": {
                                  "kind": {
                                    "type": "string",
                                    "const": "fixedPlace"
                                  },
                                  "placeId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 160,
                                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                  },
                                  "lateEntry": {
                                    "type": "string",
                                    "enum": [
                                      "allowed",
                                      "hostDecision",
                                      "closed"
                                    ]
                                  }
                                }
                              },
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "kind",
                                  "itineraryId",
                                  "stopId"
                                ],
                                "properties": {
                                  "kind": {
                                    "type": "string",
                                    "const": "itineraryStop"
                                  },
                                  "itineraryId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 2000
                                  },
                                  "stopId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 2000
                                  }
                                }
                              },
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "kind",
                                  "routeId",
                                  "groupId",
                                  "checkpointId"
                                ],
                                "properties": {
                                  "kind": {
                                    "type": "string",
                                    "const": "groupCheckpoint"
                                  },
                                  "routeId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 2000
                                  },
                                  "groupId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 160,
                                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                  },
                                  "checkpointId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 2000
                                  }
                                }
                              }
                            ]
                          }
                        }
                      }
                    },
                    "outcomes": {
                      "type": "array",
                      "minItems": 1,
                      "maxItems": 6,
                      "items": {
                        "oneOf": [
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "enum": [
                                  "accepted",
                                  "delivered",
                                  "read",
                                  "revoked"
                                ]
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "classification"
                            ],
                            "properties": {
                              "kind": {
                                "const": "failed"
                              },
                              "classification": {
                                "type": "string",
                                "enum": [
                                  "technical",
                                  "policy",
                                  "suppressed",
                                  "invalidRecipient"
                                ]
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "reason"
                            ],
                            "properties": {
                              "kind": {
                                "const": "unknown"
                              },
                              "reason": {
                                "type": "string",
                                "enum": [
                                  "timeout",
                                  "connectionLost",
                                  "workerInterrupted"
                                ]
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            {
              "type": "null"
            }
          ]
        },
        "preferences": {
          "type": "array",
          "maxItems": 41,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "groupId",
              "preference"
            ],
            "properties": {
              "groupId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "preference": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind"
                    ],
                    "properties": {
                      "kind": {
                        "const": "inherit"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind"
                    ],
                    "properties": {
                      "kind": {
                        "const": "disabled"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "template"
                    ],
                    "properties": {
                      "kind": {
                        "const": "configured"
                      },
                      "template": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "kind",
                          "version",
                          "setting",
                          "config"
                        ],
                        "properties": {
                          "kind": {
                            "const": "lateJoin"
                          },
                          "version": {
                            "const": 1
                          },
                          "setting": {
                            "anyOf": [
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "kind",
                                  "authority"
                                ],
                                "properties": {
                                  "kind": {
                                    "type": "string",
                                    "const": "enabled"
                                  },
                                  "authority": {
                                    "type": "string",
                                    "enum": [
                                      "observe",
                                      "prepare",
                                      "executeWithinPolicy"
                                    ]
                                  }
                                }
                              },
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "kind",
                                  "reason"
                                ],
                                "properties": {
                                  "kind": {
                                    "type": "string",
                                    "const": "disabled"
                                  },
                                  "reason": {
                                    "type": "string",
                                    "enum": [
                                      "hostChoice",
                                      "organizerDefault"
                                    ]
                                  }
                                }
                              }
                            ]
                          },
                          "config": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "destination",
                              "cutoff",
                              "maxMessagesPerEpisode",
                              "minimumMinutesBetweenMessages",
                              "updateOn",
                              "unanswered"
                            ],
                            "properties": {
                              "destination": {
                                "anyOf": [
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "const": "confirmedGroupProgress"
                                      }
                                    }
                                  },
                                  {
                                    "anyOf": [
                                      {
                                        "type": "object",
                                        "additionalProperties": false,
                                        "required": [
                                          "kind",
                                          "placeId",
                                          "lateEntry"
                                        ],
                                        "properties": {
                                          "kind": {
                                            "type": "string",
                                            "const": "fixedPlace"
                                          },
                                          "placeId": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 160,
                                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                          },
                                          "lateEntry": {
                                            "type": "string",
                                            "enum": [
                                              "allowed",
                                              "hostDecision",
                                              "closed"
                                            ]
                                          }
                                        }
                                      },
                                      {
                                        "type": "object",
                                        "additionalProperties": false,
                                        "required": [
                                          "kind",
                                          "itineraryId",
                                          "permittedStopIds"
                                        ],
                                        "properties": {
                                          "kind": {
                                            "type": "string",
                                            "const": "itineraryStop"
                                          },
                                          "itineraryId": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 2000
                                          },
                                          "permittedStopIds": {
                                            "type": "array",
                                            "minItems": 1,
                                            "maxItems": 1000,
                                            "items": {
                                              "type": "string",
                                              "minLength": 1,
                                              "maxLength": 2000
                                            },
                                            "uniqueItems": true
                                          }
                                        }
                                      },
                                      {
                                        "type": "object",
                                        "additionalProperties": false,
                                        "required": [
                                          "kind",
                                          "routeId",
                                          "groupId",
                                          "permittedCheckpointIds"
                                        ],
                                        "properties": {
                                          "kind": {
                                            "type": "string",
                                            "const": "groupCheckpoint"
                                          },
                                          "routeId": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 2000
                                          },
                                          "groupId": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 160,
                                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                          },
                                          "permittedCheckpointIds": {
                                            "type": "array",
                                            "minItems": 1,
                                            "maxItems": 1000,
                                            "items": {
                                              "type": "string",
                                              "minLength": 1,
                                              "maxLength": 2000
                                            },
                                            "uniqueItems": true
                                          }
                                        }
                                      }
                                    ]
                                  }
                                ]
                              },
                              "cutoff": {
                                "anyOf": [
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "eventEnd"
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "at"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "time"
                                      },
                                      "at": {
                                        "type": "integer",
                                        "minimum": 0,
                                        "maximum": 9007199254740991,
                                        "description": "UTC milliseconds."
                                      }
                                    }
                                  }
                                ]
                              },
                              "maxMessagesPerEpisode": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "minimumMinutesBetweenMessages": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 1440
                              },
                              "updateOn": {
                                "type": "string",
                                "const": "materialGuidanceChange"
                              },
                              "unanswered": {
                                "type": "string",
                                "enum": [
                                  "keepUnknownUntilCutoff",
                                  "hostReviewAtDeadline"
                                ]
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "unitOutcomes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unitOutcome",
        "revision",
        "records"
      ],
      "properties": {
        "unitOutcome": {
          "type": "string",
          "enum": [
            "completion",
            "score",
            "rank"
          ]
        },
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "records": {
          "type": "array",
          "maxItems": 500,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "unitId",
              "round",
              "outcome",
              "stateRevision",
              "operationId",
              "recordedBy",
              "recordedAt"
            ],
            "properties": {
              "unitId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2000
              },
              "round": {
                "type": "integer",
                "minimum": 0,
                "maximum": 10000
              },
              "outcome": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "completed"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "completion"
                      },
                      "completed": {
                        "type": "boolean"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "score"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "score"
                      },
                      "score": {
                        "type": "number",
                        "minimum": -9007199254740991,
                        "maximum": 9007199254740991
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "rank"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "rank"
                      },
                      "rank": {
                        "type": "number",
                        "minimum": -9007199254740991,
                        "maximum": 9007199254740991
                      }
                    }
                  }
                ]
              },
              "stateRevision": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              },
              "operationId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "recordedBy": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "recordedAt": {
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
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "revealControl": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "revision",
        "status",
        "publishedRound",
        "pendingRound",
        "startedAt",
        "countdownSeconds",
        "lastDecisionId",
        "lastAction"
      ],
      "properties": {
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "status": {
          "type": "string",
          "enum": [
            "idle",
            "countingDown",
            "revealed"
          ]
        },
        "publishedRound": {
          "type": "integer",
          "minimum": -1,
          "maximum": 100
        },
        "pendingRound": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0,
          "maximum": 100
        },
        "startedAt": {
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
        "countdownSeconds": {
          "type": "integer",
          "minimum": 1,
          "maximum": 300
        },
        "lastDecisionId": {
          "oneOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 160,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            {
              "type": "null"
            }
          ]
        },
        "lastAction": {
          "oneOf": [
            {
              "type": "string",
              "enum": [
                "startCountdown",
                "cancelPending",
                "publish"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "allocationState": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "revision",
        "proposals"
      ],
      "properties": {
        "revision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "proposals": {
          "type": "array",
          "maxItems": 100,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "proposalId",
              "attendeeIds",
              "targetUnitId",
              "baseRevision",
              "status",
              "decisionId",
              "publishedRevision",
              "proposedBy",
              "operationId",
              "proposedAt",
              "publishedAt"
            ],
            "properties": {
              "proposalId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 200,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "attendeeIds": {
                "type": "array",
                "minItems": 1,
                "maxItems": 50,
                "uniqueItems": true,
                "items": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 180
                }
              },
              "targetUnitId": {
                "type": "string",
                "pattern": "^table-[1-9][0-9]*$",
                "maxLength": 40
              },
              "baseRevision": {
                "type": "integer",
                "minimum": 0,
                "maximum": 2147483647
              },
              "status": {
                "type": "string",
                "enum": [
                  "pending",
                  "published",
                  "stale"
                ]
              },
              "decisionId": {
                "oneOf": [
                  {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 160,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "publishedRevision": {
                "type": [
                  "integer",
                  "null"
                ],
                "minimum": 1,
                "maximum": 2147483647
              },
              "proposedBy": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "operationId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "proposedAt": {
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
              "publishedAt": {
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
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "rosterReconciliation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sourceId",
        "sourceRevision",
        "rows",
        "status",
        "reconciliationRevision",
        "lastOperationId",
        "reconciledBy",
        "reconciledAt"
      ],
      "properties": {
        "sourceId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
        },
        "sourceRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "rows": {
          "type": "array",
          "minItems": 2,
          "maxItems": 52,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "rowId",
              "outcome",
              "actorId"
            ],
            "properties": {
              "rowId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 160,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "outcome": {
                "type": "string",
                "enum": [
                  "imported",
                  "duplicate",
                  "ambiguous",
                  "failed"
                ]
              },
              "actorId": {
                "oneOf": [
                  {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            }
          }
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "reconciled"
          ]
        },
        "reconciliationRevision": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "lastOperationId": {
          "oneOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciledBy": {
          "oneOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciledAt": {
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
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "guestSource": {
      "type": "string",
      "enum": [
        "simulated",
        "event"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "rosterSnapshot": {
      "type": "array",
      "minItems": 2,
      "maxItems": 50,
      "description": "Private frozen roster names and attendance only. No production identity or contact fields.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "displayName",
          "status"
        ],
        "properties": {
          "displayName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "status": {
            "type": "string",
            "enum": [
              "expected",
              "present"
            ]
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    }
  }
} as const;
