/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const createEventCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/create_event_payload.schema.json",
  "title": "CreateEventCallablePayload",
  "description": "Callable payload accepted by createEvent.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerId",
    "name",
    "startTimeMillis",
    "endTimeMillis",
    "meetingPoint",
    "meetingLocation",
    "startingPointLat",
    "startingPointLng",
    "distanceKm",
    "pace",
    "capacityLimit",
    "description",
    "priceInPaise"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "organizerId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sourceVenueId": {
      "description": "Optional organizer venue provenance. The event still stores an independent meeting-location snapshot.",
      "type": [
        "string",
        "null"
      ],
      "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
    },
    "startTimeMillis": {
      "type": "integer"
    },
    "endTimeMillis": {
      "type": "integer"
    },
    "meetingPoint": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240
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
      }
    },
    "startingPointLat": {
      "type": "number",
      "minimum": -90,
      "maximum": 90
    },
    "startingPointLng": {
      "type": "number",
      "minimum": -180,
      "maximum": 180
    },
    "locationDetails": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 1000
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
      }
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
      }
    },
    "distanceKm": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "pace": {
      "type": "string",
      "enum": [
        "easy",
        "moderate",
        "fast",
        "competitive"
      ]
    },
    "capacityLimit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "description": {
      "type": "string",
      "maxLength": 2000
    },
    "priceInPaise": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000
    },
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$"
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
      }
    },
    "privateAccess": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "inviteCode": {
          "type": "string",
          "minLength": 4,
          "maxLength": 64,
          "pattern": "^[A-Za-z0-9_-]+$"
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
    "eventSuccessDefaults": {
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
    },
    "externalOrigin": {
      "description": "External booking provenance for a companion-only operational event. Omit for a Catch-booked event.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "provider"
      ],
      "properties": {
        "provider": {
          "type": "string",
          "enum": [
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
        }
      }
    },
    "runtimeWalkInPolicy": {
      "type": "string",
      "enum": [
        "deny",
        "hostApproval",
        "autoCreate"
      ]
    },
    "constraints": {
      "type": "object",
      "additionalProperties": false,
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
      }
    }
  }
} as const;
