/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const getEventRuntimeBootstrapCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/get_event_runtime_bootstrap_response.schema.json",
  "title": "GetEventRuntimeBootstrapCallableResponse",
  "description": "Sanitized event and caller state for the no-download runtime.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "event",
    "participant"
  ],
  "properties": {
    "event": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eventId",
        "publicRuntimeId",
        "title",
        "startTimeMillis",
        "endTimeMillis",
        "serverTimeMillis",
        "locationName",
        "checkedInCount",
        "runtimeTermsVersion",
        "moduleIds",
        "layout",
        "requiredFieldIds",
        "optionalFieldIds",
        "questionnaireConfig",
        "interactionModel",
        "itinerary",
        "routePlan",
        "livePositions"
      ],
      "properties": {
        "eventId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "publicRuntimeId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9_-]{20,80}$"
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "startTimeMillis": {
          "type": "integer"
        },
        "endTimeMillis": {
          "type": "integer"
        },
        "serverTimeMillis": {
          "type": "integer",
          "minimum": 0
        },
        "locationName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "checkedInCount": {
          "type": "integer",
          "minimum": 0
        },
        "runtimeTermsVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "moduleIds": {
          "type": "array",
          "uniqueItems": true,
          "maxItems": 24,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          }
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
          "description": "Fresh, privacy-bounded Host/operator positions. Stable account identifiers are never exposed.",
          "type": "array",
          "maxItems": 20,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "role",
              "latitude",
              "longitude",
              "accuracyMeters",
              "headingDegrees",
              "recordedAtMillis",
              "staleAtMillis"
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
              "accuracyMeters": {
                "type": [
                  "number",
                  "null"
                ],
                "minimum": 0,
                "maximum": 10000
              },
              "headingDegrees": {
                "type": [
                  "number",
                  "null"
                ],
                "minimum": 0,
                "exclusiveMaximum": 360
              },
              "recordedAtMillis": {
                "type": "integer",
                "minimum": 0
              },
              "staleAtMillis": {
                "type": "integer",
                "minimum": 0
              }
            }
          }
        },
        "layout": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "layoutId",
                "label",
                "units"
              ],
              "properties": {
                "layoutId": {
                  "type": "string",
                  "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$"
                },
                "label": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "units": {
                  "type": "array",
                  "minItems": 1,
                  "maxItems": 200,
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "id",
                      "label",
                      "shape",
                      "capacity",
                      "gridX",
                      "gridY",
                      "order"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$"
                      },
                      "label": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 80
                      },
                      "shape": {
                        "type": "string",
                        "enum": [
                          "round",
                          "rect",
                          "row",
                          "court",
                          "zone"
                        ]
                      },
                      "capacity": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 1000
                      },
                      "gridX": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 199
                      },
                      "gridY": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 199
                      },
                      "order": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 200
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        "requiredFieldIds": {
          "description": "Fields that must be completed before event mode opens: display name plus at most one server-selected pre-event payload. Optional preference fields are never required for entry.",
          "type": "array",
          "uniqueItems": true,
          "maxItems": 10,
          "items": {
            "type": "string",
            "enum": [
              "displayName",
              "gender",
              "interestedInGenders",
              "relationshipGoal",
              "dateOfBirth",
              "paceBand",
              "skillBand",
              "dietaryAndSeatingNotes",
              "questionnaireAnswerIds",
              "teamName"
            ]
          }
        },
        "optionalFieldIds": {
          "description": "Plan-derived event-only answers the guest may provide to improve preference-aware suggestions. Guests may skip them and receive neutral assignments.",
          "type": "array",
          "uniqueItems": true,
          "maxItems": 10,
          "items": {
            "type": "string",
            "enum": [
              "displayName",
              "gender",
              "interestedInGenders",
              "relationshipGoal",
              "dateOfBirth",
              "paceBand",
              "skillBand",
              "dietaryAndSeatingNotes",
              "questionnaireAnswerIds",
              "teamName"
            ]
          }
        },
        "questionnaireConfig": {
          "anyOf": [
            {
              "type": "null"
            },
            {
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
            }
          ]
        }
      }
    },
    "participant": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "accessStatus",
            "attendanceStatus",
            "eventId",
            "organizerId",
            "requiredFieldIds",
            "completedFieldIds",
            "runtimeProfile"
          ],
          "properties": {
            "eventAttendeeId": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 160
            },
            "accessStatus": {
              "type": "string",
              "enum": [
                "needsClaim",
                "pendingApproval",
                "needsInput",
                "ready",
                "optedOut",
                "revoked"
              ]
            },
            "attendanceStatus": {
              "type": [
                "string",
                "null"
              ],
              "enum": [
                "invited",
                "registered",
                "waitlisted",
                "checkedIn",
                "cancelled",
                null
              ]
            },
            "eventId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "organizerId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "requiredFieldIds": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "maxItems": 10
            },
            "completedFieldIds": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "maxItems": 10
            },
            "requiredDataRequest": {
              "description": "Current event-scoped missing-data request. Omitted by older backends.",
              "anyOf": [
                {
                  "type": "null"
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "revision",
                    "fieldIds",
                    "completedFieldIds",
                    "status",
                    "requestedAtMillis",
                    "expiresAtMillis",
                    "completedAtMillis"
                  ],
                  "properties": {
                    "revision": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    },
                    "fieldIds": {
                      "type": "array",
                      "uniqueItems": true,
                      "minItems": 1,
                      "maxItems": 10,
                      "items": {
                        "type": "string",
                        "enum": [
                          "displayName",
                          "gender",
                          "interestedInGenders",
                          "relationshipGoal",
                          "dateOfBirth",
                          "paceBand",
                          "skillBand",
                          "dietaryAndSeatingNotes",
                          "questionnaireAnswerIds",
                          "teamName"
                        ]
                      }
                    },
                    "completedFieldIds": {
                      "type": "array",
                      "uniqueItems": true,
                      "maxItems": 10,
                      "items": {
                        "type": "string",
                        "enum": [
                          "displayName",
                          "gender",
                          "interestedInGenders",
                          "relationshipGoal",
                          "dateOfBirth",
                          "paceBand",
                          "skillBand",
                          "dietaryAndSeatingNotes",
                          "questionnaireAnswerIds",
                          "teamName"
                        ]
                      }
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "pending",
                        "completed",
                        "expired"
                      ]
                    },
                    "requestedAtMillis": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "expiresAtMillis": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "completedAtMillis": {
                      "type": [
                        "integer",
                        "null"
                      ],
                      "minimum": 0,
                      "maximum": 9007199254740991
                    }
                  }
                }
              ]
            },
            "runtimeProfile": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "displayName",
                "gender",
                "interestedInGenders",
                "relationshipGoal",
                "dateOfBirthMillis",
                "paceBand",
                "skillBand",
                "dietaryAndSeatingNotes",
                "questionnaireAnswerIds",
                "teamName"
              ],
              "properties": {
                "displayName": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120
                },
                "gender": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "man",
                    "woman",
                    "nonBinary",
                    "other",
                    null
                  ]
                },
                "interestedInGenders": {
                  "type": "array",
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "enum": [
                      "man",
                      "woman",
                      "nonBinary",
                      "other"
                    ]
                  }
                },
                "relationshipGoal": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "relationship",
                    "casual",
                    "marriage",
                    "friendship",
                    "unsure",
                    null
                  ]
                },
                "dateOfBirthMillis": {
                  "type": [
                    "integer",
                    "null"
                  ]
                },
                "paceBand": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "competitive",
                    "fast",
                    "moderate",
                    "easy",
                    null
                  ]
                },
                "skillBand": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "beginner",
                    "intermediate",
                    "advanced",
                    null
                  ]
                },
                "dietaryAndSeatingNotes": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "minLength": 1,
                  "maxLength": 300
                },
                "questionnaireAnswerIds": {
                  "type": "array",
                  "uniqueItems": true,
                  "maxItems": 8,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  }
                },
                "teamName": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "minLength": 1,
                  "maxLength": 80
                }
              }
            }
          }
        }
      ]
    }
  }
} as const;
