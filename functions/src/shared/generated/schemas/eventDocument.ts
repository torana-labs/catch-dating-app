/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const eventDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/events.schema.json",
  "title": "EventDocument",
  "description": "Canonical event document stored at events/{eventId}. The event id is the document id and is not stored in document data.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "events",
  "x-firestore-path": "events/{eventId}",
  "x-document-id-field": "id",
  "x-owner": "host create/update/cancel/delete callables; booking and attendance aggregates are callable-owned",
  "x-internal-demo-fields": [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsId",
    "demoOpsCommand"
  ],
  "required": [
    "organizerId",
    "startTime",
    "bookedCount",
    "checkedInCount",
    "waitlistedCount",
    "status",
    "cancelledAt",
    "cancellationReason",
    "genderCounts",
    "cohortCounts",
    "waitlistedCohortCounts"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "description": "Organizer-authored event name. Legacy documents may omit it and use the client-derived fallback title.",
      "x-catch-ownership": "callable-owned"
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "sourceVenueId": {
      "description": "Optional organizer venue used to prefill this event. Meeting location and capacity remain event-local snapshots.",
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$",
      "x-catch-ownership": "callable-owned"
    },
    "eventOrigin": {
      "title": "EventOrigin",
      "description": "Immutable operational booking/roster provenance. Missing values deny Catch booking authority.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "bookingAuthority",
        "rosterAuthority",
        "provider",
        "externalEventId",
        "externalEventUrl",
        "sourceExternalEventId",
        "adapterVersion",
        "connectedAt",
        "connectedBy"
      ],
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "catchNative",
            "externalCompanion"
          ]
        },
        "bookingAuthority": {
          "type": "string",
          "enum": [
            "catch",
            "external"
          ]
        },
        "rosterAuthority": {
          "type": "string",
          "enum": [
            "catchProjection",
            "hostImport",
            "providerSync"
          ]
        },
        "provider": {
          "type": "string",
          "enum": [
            "catch",
            "generic",
            "luma",
            "eventbrite",
            "partiful",
            "posh",
            "bookmyshow",
            "district",
            "sortmyscene",
            "airbnb"
          ]
        },
        "externalEventId": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 240
        },
        "externalEventUrl": {
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
        "sourceExternalEventId": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 180
        },
        "adapterVersion": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 80
        },
        "connectedAt": {
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
        "connectedBy": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 180
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "runtimeAccess": {
      "title": "EventRuntimeAccess",
      "description": "Server-owned no-download Event Success runtime access configuration.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "enabled",
        "publicRuntimeId",
        "walkInPolicy",
        "termsVersion"
      ],
      "properties": {
        "enabled": {
          "type": "boolean"
        },
        "publicRuntimeId": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^[A-Za-z0-9_-]{20,80}$"
        },
        "walkInPolicy": {
          "type": "string",
          "enum": [
            "deny",
            "hostApproval",
            "autoCreate"
          ]
        },
        "termsVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        }
      },
      "x-catch-ownership": "callable-owned"
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "endTime": {
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
    "meetingPoint": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "x-catch-ownership": "callable-owned"
    },
    "meetingLocation": {
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "startingPointLat": {
      "type": "number",
      "minimum": -90,
      "maximum": 90,
      "x-catch-ownership": "callable-owned"
    },
    "startingPointLng": {
      "type": "number",
      "minimum": -180,
      "maximum": 180,
      "x-catch-ownership": "callable-owned"
    },
    "locationDetails": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 1000,
      "x-catch-ownership": "callable-owned"
    },
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
      },
      "x-catch-ownership": "callable-owned"
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
      ],
      "x-catch-ownership": "callable-owned"
    },
    "eventPhotos": {
      "type": "array",
      "items": {
        "title": "UploadedPhoto",
        "description": "Canonical uploaded image object for ordered media galleries, logos, and event photos.",
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "url",
          "storagePath",
          "thumbnailUrl",
          "thumbnailStoragePath",
          "position",
          "createdAt",
          "updatedAt"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "pattern": "^[A-Za-z0-9_-]+$"
          },
          "url": {
            "type": "string",
            "format": "uri",
            "maxLength": 2048
          },
          "storagePath": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512,
            "pattern": "^[^/\\u0000][^\\u0000]*$"
          },
          "thumbnailUrl": {
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
          "thumbnailStoragePath": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512,
                "pattern": "^[^/\\u0000][^\\u0000]*$"
              },
              {
                "type": "null"
              }
            ]
          },
          "position": {
            "type": "integer",
            "minimum": 0
          },
          "moderation": {
            "type": [
              "object",
              "null"
            ],
            "additionalProperties": false,
            "required": [
              "status"
            ],
            "properties": {
              "status": {
                "type": "string",
                "enum": [
                  "pending",
                  "approved",
                  "rejected"
                ]
              },
              "reason": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 240
              },
              "reviewedAt": {
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
        },
        "definitions": {
          "storageObjectPath": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512,
            "pattern": "^[^/\\u0000][^\\u0000]*$"
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "distanceKm": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "x-catch-ownership": "callable-owned"
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
      },
      "x-catch-ownership": "callable-owned"
    },
    "pace": {
      "type": "string",
      "enum": [
        "easy",
        "moderate",
        "fast",
        "competitive"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "capacityLimit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "x-catch-ownership": "callable-owned"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "x-catch-ownership": "callable-owned"
    },
    "priceInPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000,
      "x-catch-ownership": "callable-owned"
    },
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$",
      "x-catch-ownership": "callable-owned"
    },
    "bookedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "checkedInCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "waitlistedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "cancelled"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "cancelledAt": {
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
    "cancellationReason": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500,
      "x-catch-ownership": "callable-owned"
    },
    "publicRegistrationEnabled": {
      "type": "boolean",
      "description": "When true, the published marketing event route may register a phone-OTP identity into eventAttendees without creating a Consumer profile.",
      "x-catch-ownership": "callable-owned"
    },
    "constraints": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "minAge",
        "maxAge",
        "maxMen",
        "maxWomen"
      ],
      "properties": {
        "minAge": {
          "type": "integer",
          "minimum": 0,
          "maximum": 120
        },
        "maxAge": {
          "type": "integer",
          "minimum": 0,
          "maximum": 120
        },
        "maxMen": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "maxWomen": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "eventPolicy": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "version",
        "admission",
        "pricing",
        "cancellation",
        "settlement"
      ],
      "properties": {
        "version": {
          "type": "integer",
          "enum": [
            1,
            2
          ],
          "description": "Version 2 models cancellation as notApplicable for free events. Version 1 remains readable for legacy snapshots."
        },
        "admission": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "format",
            "capacityLimit",
            "waitlistPolicy",
            "inviteRequired",
            "membershipRequired",
            "manualApprovalRequired",
            "privateAccessPolicy",
            "cohortCapacityLimits",
            "balancedRatioPolicy"
          ],
          "properties": {
            "format": {
              "type": "string",
              "enum": [
                "open",
                "inviteOnly",
                "manualApproval",
                "fixedCohortCaps",
                "balancedRatio",
                "membersOnly"
              ]
            },
            "capacityLimit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 1000
            },
            "waitlistPolicy": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "mode",
                "offerWindowMinutes"
              ],
              "properties": {
                "mode": {
                  "type": "string",
                  "enum": [
                    "disabled",
                    "rankedOffer",
                    "broadcastFirstComeFirstServed",
                    "manualReview"
                  ]
                },
                "offerWindowMinutes": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 10080
                }
              }
            },
            "inviteRequired": {
              "type": "boolean"
            },
            "membershipRequired": {
              "type": "boolean"
            },
            "manualApprovalRequired": {
              "type": "boolean"
            },
            "approvedMembersSkipReview": {
              "type": "boolean",
              "description": "When true, current approved organizer community members may skip event review. Does not waive invitation, capacity, cohort or payment rules. Missing means false."
            },
            "privateAccessPolicy": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "mode",
                "inviteCodeHint",
                "privateLinkEnabled"
              ],
              "properties": {
                "mode": {
                  "type": "string",
                  "enum": [
                    "none",
                    "inviteCode"
                  ]
                },
                "inviteCodeHint": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 64
                },
                "privateLinkEnabled": {
                  "type": "boolean"
                }
              }
            },
            "cohortCapacityLimits": {
              "type": "object",
              "additionalProperties": {
                "type": "integer",
                "minimum": 0
              }
            },
            "balancedRatioPolicy": {
              "type": [
                "object",
                "null"
              ],
              "additionalProperties": false,
              "required": [
                "leftCohortId",
                "rightCohortId",
                "maxSkew",
                "openingBufferPerCohort",
                "outOfRatioCohortPolicy"
              ],
              "properties": {
                "leftCohortId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "rightCohortId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "maxSkew": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 1000
                },
                "openingBufferPerCohort": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 1000
                },
                "outOfRatioCohortPolicy": {
                  "type": "string",
                  "enum": [
                    "admitWithinGeneralCapacity",
                    "waitlist",
                    "manualReview",
                    "reject"
                  ]
                }
              }
            },
            "crossPathsPairInventory": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "enabled",
                "reservedPairCapacity",
                "holdDurationMinutes"
              ],
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "reservedPairCapacity": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 100
                },
                "holdDurationMinutes": {
                  "type": "integer",
                  "minimum": 5,
                  "maximum": 30
                }
              }
            }
          }
        },
        "pricing": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "basePriceInPaise",
            "cohortAdjustmentsInPaise",
            "demandPricingRules"
          ],
          "properties": {
            "basePriceInPaise": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100000000
            },
            "cohortAdjustmentsInPaise": {
              "type": "object",
              "additionalProperties": {
                "type": "integer",
                "minimum": -100000000,
                "maximum": 100000000
              }
            },
            "demandPricingRules": {
              "type": "array",
              "maxItems": 20,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "pricedCohortId",
                  "balancingCohortId",
                  "stepAdjustmentInPaise",
                  "maxAdjustmentInPaise",
                  "freeSkew",
                  "demandStep"
                ],
                "properties": {
                  "pricedCohortId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  },
                  "balancingCohortId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  },
                  "stepAdjustmentInPaise": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100000000
                  },
                  "maxAdjustmentInPaise": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100000000
                  },
                  "freeSkew": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 1000
                  },
                  "demandStep": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 1000
                  }
                }
              }
            }
          }
        },
        "cancellation": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "policyId"
          ],
          "properties": {
            "policyId": {
              "type": "string",
              "enum": [
                "notApplicable",
                "flexible",
                "standard",
                "strict"
              ]
            }
          }
        },
        "settlement": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "hostPayoutTiming"
          ],
          "properties": {
            "hostPayoutTiming": {
              "type": "string",
              "enum": [
                "afterEventCompletion"
              ]
            }
          }
        }
      },
      "if": {
        "properties": {
          "version": {
            "const": 2
          },
          "pricing": {
            "properties": {
              "basePriceInPaise": {
                "const": 0
              }
            },
            "required": [
              "basePriceInPaise"
            ]
          }
        },
        "required": [
          "version",
          "pricing"
        ]
      },
      "then": {
        "properties": {
          "cancellation": {
            "properties": {
              "policyId": {
                "const": "notApplicable"
              }
            }
          }
        }
      },
      "else": {
        "if": {
          "properties": {
            "version": {
              "const": 2
            }
          },
          "required": [
            "version"
          ]
        },
        "then": {
          "properties": {
            "cancellation": {
              "properties": {
                "policyId": {
                  "enum": [
                    "flexible",
                    "standard",
                    "strict"
                  ]
                }
              }
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "genderCounts": {
      "type": "object",
      "additionalProperties": {
        "type": "integer",
        "minimum": 0
      },
      "x-catch-ownership": "callable-owned"
    },
    "cohortCounts": {
      "type": "object",
      "additionalProperties": {
        "type": "integer",
        "minimum": 0
      },
      "x-catch-ownership": "callable-owned"
    },
    "waitlistedCohortCounts": {
      "type": "object",
      "additionalProperties": {
        "type": "integer",
        "minimum": 0
      },
      "x-catch-ownership": "callable-owned"
    },
    "crossPathsPairHeldCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "crossPathsPairConfirmedCount": {
      "type": "integer",
      "minimum": 0,
      "x-catch-ownership": "callable-owned"
    },
    "crossPathsPairHeldCohortCounts": {
      "type": "object",
      "additionalProperties": {
        "type": "integer",
        "minimum": 0
      },
      "x-catch-ownership": "callable-owned"
    },
    "crossPathsDiscoveryEnabled": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryMarketId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryCityName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "pattern": "^[a-z0-9-]+$",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryActivityKind": {
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
      ],
      "x-catch-ownership": "callable-owned"
    },
    "discoveryGeoCell": {
      "type": "string",
      "pattern": "^-?\\d+:-?\\d+$",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryHasOpenSpots": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryAvailability": {
      "type": "string",
      "enum": [
        "open",
        "waitlist",
        "gated",
        "full",
        "cancelled"
      ],
      "x-catch-ownership": "callable-owned"
    },
    "discoveryOpenCohorts": {
      "type": "array",
      "maxItems": 4,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "menInterestedInWomen",
          "womenInterestedInMen",
          "queerOrOpen",
          "nonBinaryOrOther"
        ]
      },
      "x-catch-ownership": "callable-owned"
    },
    "discoveryWaitlistCohorts": {
      "type": "array",
      "maxItems": 4,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "menInterestedInWomen",
          "womenInterestedInMen",
          "queerOrOpen",
          "nonBinaryOrOther"
        ]
      },
      "x-catch-ownership": "callable-owned"
    },
    "discoveryInviteRequired": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryMembershipRequired": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryManualApprovalRequired": {
      "type": "boolean",
      "x-catch-ownership": "callable-owned"
    },
    "discoveryMinAge": {
      "type": "integer",
      "minimum": 0,
      "maximum": 120,
      "x-catch-ownership": "callable-owned"
    },
    "discoveryMaxAge": {
      "type": "integer",
      "minimum": 0,
      "maximum": 120,
      "x-catch-ownership": "callable-owned"
    },
    "adminSearch": {
      "type": "object",
      "additionalProperties": false,
      "description": "Server-owned deterministic search projection used by admin event publishing. Rebuildable from canonical event and organizer fields; not consumed by the app.",
      "required": [
        "tokens",
        "sortKey",
        "updatedAt",
        "updatedBySource"
      ],
      "properties": {
        "tokens": {
          "type": "array",
          "maxItems": 120,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 2,
            "maxLength": 80,
            "pattern": "^[a-z0-9-]+$"
          }
        },
        "sortKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160,
          "pattern": "^[a-z0-9-]+$"
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
        },
        "updatedBySource": {
          "type": "string",
          "enum": [
            "adminUpdateEventDetails",
            "adminEventSearchBackfill"
          ]
        }
      },
      "x-catch-ownership": "server-only"
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
    },
    "createdAt": {
      "type": "object",
      "description": "Server creation time of a progressively configured event.",
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
      "description": "Latest backend event mutation timestamp when supplied by its owner, including attendance aggregate updates. Legacy events may omit it.",
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
    "planChangeRevision": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned",
      "description": "Monotonic revision for immutable attendee-relevant plan change records. Missing legacy values read as zero."
    },
    "publicationState": {
      "type": "string",
      "enum": [
        "private",
        "published"
      ],
      "description": "Explicit publication boundary. Legacy absent values require full rich event data; new progressive events must declare their state.",
      "x-catch-ownership": "callable-owned"
    },
    "setupRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 2147483647,
      "x-catch-ownership": "callable-owned"
    },
    "eventCityId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "eventMarketId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "eventLocalDate": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
      "x-catch-ownership": "callable-owned"
    },
    "eventLocalStartTime": {
      "type": "string",
      "pattern": "^[0-9]{2}:[0-9]{2}$",
      "x-catch-ownership": "callable-owned"
    },
    "eventTimezone": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-catch-ownership": "callable-owned"
    },
    "setupDefaults": {
      "title": "EventSetupDefaults",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "city",
        "timezone",
        "organizerDefaultsRevision",
        "organizerDefaultsHash"
      ],
      "properties": {
        "city": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "value",
            "source"
          ],
          "properties": {
            "value": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "cityId",
                "marketId"
              ],
              "properties": {
                "cityId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 180
                },
                "marketId": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 180
                }
              }
            },
            "source": {
              "type": "string",
              "enum": [
                "organizer",
                "event"
              ]
            }
          }
        },
        "timezone": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "value",
            "source"
          ],
          "properties": {
            "value": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "source": {
              "type": "string",
              "enum": [
                "organizer",
                "event"
              ]
            }
          }
        },
        "organizerDefaultsRevision": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "organizerDefaultsHash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        }
      },
      "definitions": {
        "basicsInput": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "name",
            "city",
            "localDate",
            "localStartTime",
            "timezone"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "city": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "mode"
                  ],
                  "properties": {
                    "mode": {
                      "const": "inherit",
                      "type": "string"
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "mode",
                    "value"
                  ],
                  "properties": {
                    "mode": {
                      "const": "set",
                      "type": "string"
                    },
                    "value": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "cityId",
                        "marketId"
                      ],
                      "properties": {
                        "cityId": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 180
                        },
                        "marketId": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 180
                        }
                      }
                    }
                  }
                }
              ]
            },
            "localDate": {
              "type": "string",
              "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
            },
            "localStartTime": {
              "type": "string",
              "pattern": "^[0-9]{2}:[0-9]{2}$"
            },
            "timezone": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "mode"
                  ],
                  "properties": {
                    "mode": {
                      "const": "inherit",
                      "type": "string"
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "mode",
                    "value"
                  ],
                  "properties": {
                    "mode": {
                      "const": "set",
                      "type": "string"
                    },
                    "value": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 100
                    }
                  }
                }
              ]
            },
            "reviewedDefaultsHash": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            }
          }
        }
      },
      "x-catch-ownership": "callable-owned"
    },
    "publicRegistrationMode": {
      "type": "string",
      "enum": [
        "closed",
        "free",
        "paid"
      ],
      "description": "Explicit registration capability. Older enabled events without this field support free OTP registration only.",
      "x-catch-ownership": "callable-owned"
    },
    "publicRegistrationRevision": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "firstPublishedAt": {
      "type": "object",
      "description": "First explicit progressive publication. Retained on unpublish so prior schedule commitments cannot be treated as a new draft.",
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
    "catchExperienceActivities": {
      "type": "array",
      "minItems": 1,
      "maxItems": 3,
      "uniqueItems": true,
      "description": "Explicit published declaration of Catch-assisted guest participation. Booking, payments, attendance and logistics alone do not qualify. Omit when not offered.",
      "items": {
        "type": "string",
        "enum": [
          "introductions",
          "sharedActivities",
          "rotations"
        ]
      }
    }
  },
  "allOf": [
    {
      "if": {
        "required": [
          "publicationState"
        ],
        "properties": {
          "publicationState": {
            "const": "private"
          }
        }
      },
      "then": {
        "required": [
          "organizerId",
          "name",
          "eventCityId",
          "eventMarketId",
          "eventLocalDate",
          "eventLocalStartTime",
          "eventTimezone",
          "setupDefaults",
          "setupRevision",
          "publicRegistrationEnabled"
        ],
        "properties": {
          "publicRegistrationEnabled": {
            "const": false
          }
        }
      },
      "else": {
        "required": [
          "organizerId",
          "startTime",
          "endTime",
          "meetingPoint",
          "meetingLocation",
          "startingPointLat",
          "startingPointLng",
          "locationDetails",
          "eventFormat",
          "distanceKm",
          "pace",
          "capacityLimit",
          "description",
          "priceInPaise",
          "bookedCount",
          "checkedInCount",
          "waitlistedCount",
          "status",
          "cancelledAt",
          "cancellationReason",
          "constraints",
          "genderCounts",
          "cohortCounts",
          "waitlistedCohortCounts",
          "discoveryMarketId",
          "discoveryCityName",
          "discoveryActivityKind",
          "discoveryGeoCell",
          "discoveryHasOpenSpots",
          "discoveryAvailability",
          "discoveryOpenCohorts",
          "discoveryWaitlistCohorts",
          "discoveryInviteRequired",
          "discoveryMembershipRequired",
          "discoveryManualApprovalRequired",
          "discoveryMinAge",
          "discoveryMaxAge"
        ]
      }
    },
    {
      "if": {
        "required": [
          "setupRevision"
        ]
      },
      "then": {
        "required": [
          "publicationState",
          "organizerId",
          "name",
          "eventCityId",
          "eventMarketId",
          "eventLocalDate",
          "eventLocalStartTime",
          "eventTimezone",
          "setupDefaults"
        ]
      }
    },
    {
      "if": {
        "required": [
          "publicRegistrationMode"
        ]
      },
      "then": {
        "required": [
          "publicRegistrationRevision",
          "publicRegistrationEnabled"
        ]
      }
    },
    {
      "if": {
        "required": [
          "publicRegistrationMode"
        ],
        "properties": {
          "publicRegistrationMode": {
            "const": "closed"
          }
        }
      },
      "then": {
        "properties": {
          "publicRegistrationEnabled": {
            "const": false
          }
        }
      }
    },
    {
      "if": {
        "required": [
          "publicRegistrationMode"
        ],
        "properties": {
          "publicRegistrationMode": {
            "enum": [
              "free",
              "paid"
            ]
          }
        }
      },
      "then": {
        "properties": {
          "publicRegistrationEnabled": {
            "const": true
          }
        }
      }
    }
  ]
} as const;
