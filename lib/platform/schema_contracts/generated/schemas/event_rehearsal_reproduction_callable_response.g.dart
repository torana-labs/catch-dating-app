// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_rehearsal_reproduction_response.schema.json.

const schemaEventRehearsalReproductionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_rehearsal_reproduction_response.schema.json',
  'title': 'EventRehearsalReproductionCallableResponse',
  'description': 'Portable deterministic reproduction record for internal QA and product review.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'sessionId',
    'scenarioId',
    'seed',
    'setup',
    'actions',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'sessionId': <String, Object?>{
      'type': 'string',
    },
    'scenarioId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'smoothRun',
        'lateAndNoShow',
        'earlyExitAndReturn',
        'rosterAndCapacity',
        'walkInAndAmbiguousClaim',
        'privacyAndKeepApart',
        'lowConnectivity',
        'concurrentHosts',
        'revealInterrupted',
        'externalProfiles',
        'accountabilitySweep',
      ],
    },
    'seed': <String, Object?>{
      'type': 'integer',
    },
    'setup': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'title',
        'locationName',
        'durationMinutes',
        'hostGoal',
        'attendeePrompt',
        'moduleIds',
      ],
      'properties': <String, Object?>{
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'locationName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'durationMinutes': <String, Object?>{
          'type': 'integer',
          'minimum': 30,
          'maximum': 360,
        },
        'hostGoal': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 300,
        },
        'attendeePrompt': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 320,
        },
        'moduleIds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'arrival',
              'firstHello',
              'pods',
              'rotations',
              'conversationCues',
              'reveal',
              'afterglow',
              'accountability',
            ],
          },
        },
        'unitOutcome': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
            'completion',
            'score',
            'rank',
          ],
        },
        'movementSimulation': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Frozen, synthetic-only movement truth used by dress rehearsal. It never reads or writes a real person\'s live position.',
          'required': <Object?>[
            'itinerary',
            'routePlan',
            'livePositions',
            'lateArrivalGuidance',
          ],
          'properties': <String, Object?>{
            'itinerary': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'description': 'One public, event-local run-of-show entry. Offset is measured from the event start so rescheduling does not rewrite the itinerary.',
                'required': <Object?>[
                  'id',
                  'kind',
                  'offsetMinutes',
                  'title',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                    'pattern': '^[A-Za-z0-9_-]+\$',
                  },
                  'kind': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'gather',
                      'activity',
                      'stop',
                      'break',
                      'transition',
                      'finish',
                    ],
                  },
                  'offsetMinutes': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1440,
                  },
                  'durationMinutes': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 1,
                    'maximum': 1440,
                  },
                  'title': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'description': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 500,
                  },
                  'location': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
                        'required': <Object?>[
                          'name',
                          'latitude',
                          'longitude',
                        ],
                        'properties': <String, Object?>{
                          'name': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 240,
                          },
                          'address': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'maxLength': 500,
                          },
                          'placeId': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'minLength': 1,
                            'maxLength': 256,
                          },
                          'latitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -90,
                            'maximum': 90,
                          },
                          'longitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -180,
                            'maximum': 180,
                          },
                          'notes': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'maxLength': 1000,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'routeDistanceMeters': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                },
              },
            },
            'routePlan': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'null',
                },
                <String, Object?>{
                  'type': 'object',
                  'description': 'Composable operations for an event that moves through a route. Activity kind remains the broader format authority.',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'version',
                    'movementMode',
                    'routeShape',
                    'groupStrategy',
                    'stopCadence',
                    'stopKinds',
                    'roleKinds',
                  ],
                  'properties': <String, Object?>{
                    'version': <String, Object?>{
                      'type': 'integer',
                      'enum': <Object?>[
                        1,
                        2,
                      ],
                    },
                    'movementMode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'run',
                        'walk',
                        'ride',
                        'mixed',
                      ],
                    },
                    'routeShape': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'loop',
                        'outAndBack',
                        'pointToPoint',
                      ],
                    },
                    'groupStrategy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'together',
                        'paceGroups',
                        'selfDirected',
                      ],
                    },
                    'stopCadence': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'continuous',
                        'flexibleStops',
                        'hostedStops',
                      ],
                    },
                    'stopKinds': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 7,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'water',
                          'regroup',
                          'venue',
                          'photoSpot',
                          'viewpoint',
                          'hazard',
                          'turnaround',
                        ],
                      },
                    },
                    'roleKinds': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 6,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'routeLead',
                          'sweep',
                          'pacer',
                          'stopHost',
                          'marshal',
                          'photographer',
                        ],
                      },
                    },
                    'path': <String, Object?>{
                      'type': 'array',
                      'minItems': 2,
                      'maxItems': 500,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'latitude',
                          'longitude',
                        ],
                        'properties': <String, Object?>{
                          'latitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -90,
                            'maximum': 90,
                          },
                          'longitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -180,
                            'maximum': 180,
                          },
                        },
                      },
                    },
                    'paceGroups': <String, Object?>{
                      'type': 'array',
                      'maxItems': 12,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'id',
                          'label',
                          'sortOrder',
                        ],
                        'properties': <String, Object?>{
                          'id': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                            'pattern': '^[A-Za-z0-9_-]+\$',
                          },
                          'label': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                          },
                          'targetPaceSecondsPerKm': <String, Object?>{
                            'type': <Object?>[
                              'integer',
                              'null',
                            ],
                            'minimum': 120,
                            'maximum': 1800,
                          },
                          'sortOrder': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 1000,
                          },
                        },
                      },
                    },
                    'liveTrackingPolicy': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'mode',
                        'staleAfterSeconds',
                        'retentionMinutes',
                      ],
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'disabled',
                            'hostOnly',
                            'authorizedOperators',
                          ],
                        },
                        'staleAfterSeconds': <String, Object?>{
                          'type': 'integer',
                          'minimum': 30,
                          'maximum': 600,
                        },
                        'retentionMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 5,
                          'maximum': 1440,
                        },
                      },
                    },
                  },
                },
              ],
            },
            'livePositions': <String, Object?>{
              'type': 'array',
              'maxItems': 2,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'role',
                  'latitude',
                  'longitude',
                  'recordedOffsetMinutes',
                ],
                'properties': <String, Object?>{
                  'role': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'host',
                      'operator',
                    ],
                  },
                  'latitude': <String, Object?>{
                    'type': 'number',
                    'minimum': -90,
                    'maximum': 90,
                  },
                  'longitude': <String, Object?>{
                    'type': 'number',
                    'minimum': -180,
                    'maximum': 180,
                  },
                  'recordedOffsetMinutes': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 360,
                  },
                },
              },
            },
            'lateArrivalGuidance': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 320,
            },
          },
        },
        'eventFormat': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'version',
            'activityKind',
            'interactionModel',
          ],
          'properties': <String, Object?>{
            'version': <String, Object?>{
              'type': 'integer',
              'const': 1,
            },
            'activityKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'socialRun',
                'running',
                'walking',
                'pickleball',
                'padel',
                'tennis',
                'badminton',
                'cycling',
                'spinClass',
                'yoga',
                'strengthTraining',
                'pubQuiz',
                'barCrawl',
                'dinner',
                'singlesMixer',
                'openActivity',
              ],
            },
            'interactionModel': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'pacePods',
                'pairedRotations',
                'teamRotations',
                'seatedTable',
                'freeFormMixer',
                'hostLedProgram',
                'openFormat',
              ],
            },
            'customActivityLabel': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'defaultPlaybookId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'defaultModuleIds': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'maxItems': 30,
              'uniqueItems': true,
            },
            'eventSuccessPrimitives': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'description': 'Optional event-success behavior primitives for custom or unsupported activity formats. These fields translate a saved event format into the small set of primitives event success can reason about.',
              'properties': <String, Object?>{
                'phoneAvailability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'continuous',
                    'plannedPauses',
                    'arrivalAndPostEventOnly',
                    'hostOnlyLive',
                    'noneDuringActivity',
                  ],
                },
                'rotationSuitability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'plannedBreaks',
                    'continuousRounds',
                  ],
                },
                'assignmentAlgorithm': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'pacePods',
                    'socialPods',
                    'pairRotations',
                    'teamBalancer',
                    'tableSeating',
                  ],
                },
                'compatibilityPolicy': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'socialCohortBalance',
                    'mutualInterestOnly',
                    'questionnaireClueOnly',
                  ],
                },
                'matchingObjective': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'coverage',
                    'romantic',
                    'affinity',
                    'novelty',
                    'balance',
                    'spread',
                  ],
                },
                'unitOutcome': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'completion',
                    'score',
                    'rank',
                  ],
                },
                'accountability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'none',
                    'rollCall',
                    'sweep',
                  ],
                },
                'durationShape': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'continuous',
                    'rounds',
                    'courses',
                    'segments',
                  ],
                },
              },
            },
            'activityDetails': <String, Object?>{
              'type': 'object',
              'additionalProperties': true,
              'properties': <String, Object?>{
                'routePlan': <String, Object?>{
                  'type': 'object',
                  'description': 'Composable operations for an event that moves through a route. Activity kind remains the broader format authority.',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'version',
                    'movementMode',
                    'routeShape',
                    'groupStrategy',
                    'stopCadence',
                    'stopKinds',
                    'roleKinds',
                  ],
                  'properties': <String, Object?>{
                    'version': <String, Object?>{
                      'type': 'integer',
                      'enum': <Object?>[
                        1,
                        2,
                      ],
                    },
                    'movementMode': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'run',
                        'walk',
                        'ride',
                        'mixed',
                      ],
                    },
                    'routeShape': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'loop',
                        'outAndBack',
                        'pointToPoint',
                      ],
                    },
                    'groupStrategy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'together',
                        'paceGroups',
                        'selfDirected',
                      ],
                    },
                    'stopCadence': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'continuous',
                        'flexibleStops',
                        'hostedStops',
                      ],
                    },
                    'stopKinds': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 7,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'water',
                          'regroup',
                          'venue',
                          'photoSpot',
                          'viewpoint',
                          'hazard',
                          'turnaround',
                        ],
                      },
                    },
                    'roleKinds': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 6,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'routeLead',
                          'sweep',
                          'pacer',
                          'stopHost',
                          'marshal',
                          'photographer',
                        ],
                      },
                    },
                    'path': <String, Object?>{
                      'type': 'array',
                      'minItems': 2,
                      'maxItems': 500,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'latitude',
                          'longitude',
                        ],
                        'properties': <String, Object?>{
                          'latitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -90,
                            'maximum': 90,
                          },
                          'longitude': <String, Object?>{
                            'type': 'number',
                            'minimum': -180,
                            'maximum': 180,
                          },
                        },
                      },
                    },
                    'paceGroups': <String, Object?>{
                      'type': 'array',
                      'maxItems': 12,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'id',
                          'label',
                          'sortOrder',
                        ],
                        'properties': <String, Object?>{
                          'id': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                            'pattern': '^[A-Za-z0-9_-]+\$',
                          },
                          'label': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                          },
                          'targetPaceSecondsPerKm': <String, Object?>{
                            'type': <Object?>[
                              'integer',
                              'null',
                            ],
                            'minimum': 120,
                            'maximum': 1800,
                          },
                          'sortOrder': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 1000,
                          },
                        },
                      },
                    },
                    'liveTrackingPolicy': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'mode',
                        'staleAfterSeconds',
                        'retentionMinutes',
                      ],
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'disabled',
                            'hostOnly',
                            'authorizedOperators',
                          ],
                        },
                        'staleAfterSeconds': <String, Object?>{
                          'type': 'integer',
                          'minimum': 30,
                          'maximum': 600,
                        },
                        'retentionMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 5,
                          'maximum': 1440,
                        },
                      },
                    },
                  },
                },
                'publicDetails': <String, Object?>{
                  'type': 'object',
                  'description': 'Optional host-authored notes for public event pages. Blank notes are omitted.',
                  'additionalProperties': true,
                  'properties': <String, Object?>{
                    'requirements': <String, Object?>{
                      'type': 'string',
                      'maxLength': 2000,
                    },
                    'accessibility': <String, Object?>{
                      'type': 'string',
                      'maxLength': 2000,
                    },
                    'included': <String, Object?>{
                      'type': 'string',
                      'maxLength': 2000,
                    },
                  },
                },
              },
            },
          },
        },
        'successDefaults': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'enabled': <String, Object?>{
              'type': 'boolean',
            },
            'layoutId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
            },
            'playbookId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'selectedModuleIds': <String, Object?>{
              'type': 'array',
              'maxItems': 24,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
            },
            'moduleSelectionConfigured': <String, Object?>{
              'type': 'boolean',
            },
            'structureConfig': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'unitKind',
                'unitSize',
                'revealCountdownSeconds',
              ],
              'properties': <String, Object?>{
                'unitKind': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'wholeGroup',
                    'pods',
                    'pairs',
                    'teams',
                    'tables',
                  ],
                },
                'unitSize': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 1000,
                },
                'unitCount': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 200,
                },
                'rotationIntervalMinutes': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 5,
                  'maximum': 180,
                },
                'topology': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'set',
                    'sequence',
                    'adjacency',
                  ],
                },
                'resourceCapacity': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'concurrentUnits',
                        'resourceLabelId',
                        'seatsPerUnit',
                      ],
                      'properties': <String, Object?>{
                        'concurrentUnits': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 200,
                        },
                        'resourceLabelId': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'court',
                            'table',
                            'lane',
                            'board',
                          ],
                        },
                        'seatsPerUnit': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 1000,
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'revealCountdownSeconds': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 60,
                },
                'rotationRepeatStrategy': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'avoid',
                    'allowWhenExhausted',
                  ],
                },
                'maxPairMeetings': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 10,
                },
                'balanceActivityAttributes': <String, Object?>{
                  'type': 'array',
                  'maxItems': 8,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'paceBand',
                      'skillBand',
                      'roleBand',
                    ],
                  },
                },
                'clusterActivityAttributes': <String, Object?>{
                  'type': 'array',
                  'maxItems': 8,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'paceBand',
                      'skillBand',
                      'roleBand',
                    ],
                  },
                },
              },
              'allOf': <Object?>[
                <String, Object?>{
                  'if': <String, Object?>{
                    'required': <Object?>[
                      'resourceCapacity',
                    ],
                    'properties': <String, Object?>{
                      'resourceCapacity': <String, Object?>{
                        'type': 'object',
                        'required': <Object?>[
                          'seatsPerUnit',
                        ],
                        'properties': <String, Object?>{
                          'seatsPerUnit': <String, Object?>{
                            'type': 'integer',
                          },
                        },
                      },
                    },
                  },
                  'then': <String, Object?>{
                    'required': <Object?>[
                      'topology',
                    ],
                    'properties': <String, Object?>{
                      'topology': <String, Object?>{
                        'const': 'adjacency',
                      },
                    },
                  },
                },
              ],
            },
            'hostGoal': <String, Object?>{
              'type': 'string',
              'maxLength': 300,
            },
            'wingmanRequestsEnabled': <String, Object?>{
              'type': 'boolean',
            },
            'contextualOpenersEnabled': <String, Object?>{
              'type': 'boolean',
            },
            'compatibilityAffectsRanking': <String, Object?>{
              'type': 'boolean',
            },
            'questionnaireConfig': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'templateId',
              ],
              'properties': <String, Object?>{
                'templateId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'customTitle': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 80,
                },
                'customQuestions': <String, Object?>{
                  'type': 'array',
                  'maxItems': 8,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'prompt',
                      'options',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'prompt': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 140,
                      },
                      'options': <String, Object?>{
                        'type': 'array',
                        'minItems': 2,
                        'maxItems': 5,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'id',
                            'label',
                          ],
                          'properties': <String, Object?>{
                            'id': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 120,
                            },
                            'label': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 80,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            'attendeePrompt': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 300,
            },
          },
        },
      },
    },
    'actions': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
      },
    },
  },
};
