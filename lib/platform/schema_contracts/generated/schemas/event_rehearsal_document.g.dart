// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsals.schema.json.

const schemaEventRehearsalDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_rehearsals.schema.json',
  'title': 'EventRehearsalDocument',
  'description': 'Server-owned isolated Host rehearsal session stored at eventRehearsals/{sessionId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventRehearsals',
  'x-firestore-path': 'eventRehearsals/{sessionId}',
  'x-document-id-field': 'id',
  'x-owner': 'event rehearsal callables',
  'required': <Object?>[
    'organizerId',
    'clubId',
    'ownerUid',
    'sourceEventId',
    'sourceEventRevision',
    'publicRehearsalId',
    'viewerTokenHash',
    'scenarioId',
    'seed',
    'actorCount',
    'actionCount',
    'status',
    'setup',
    'setupRevision',
    'runtimeRevision',
    'activeStepIndex',
    'virtualStartedAt',
    'virtualNow',
    'faultId',
    'faultConsumed',
    'createdAt',
    'updatedAt',
    'expiresAt',
    'completedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'ownerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'sourceEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'sourceEventRevision': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'publicRehearsalId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'viewerTokenHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'seed': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'actorCount': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
      'maximum': 50,
      'x-catch-ownership': 'callable-owned',
    },
    'actionCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'ready',
        'running',
        'paused',
        'complete',
        'expired',
      ],
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'setupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'runtimeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'activeStepIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 8,
      'x-catch-ownership': 'callable-owned',
    },
    'virtualStartedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'virtualNow': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'faultId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'none',
        'latency',
        'oneShotFailure',
        'listenerDisconnect',
        'staleRevision',
        'duplicateDelivery',
        'legacyFixture',
        'reducedMotion',
        'lowBandwidth',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'faultConsumed': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'completedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'staff': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'revision',
        'operators',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'operators': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'operatorId',
              'displayName',
              'duties',
            ],
            'properties': <String, Object?>{
              'operatorId': <String, Object?>{
                'type': 'string',
                'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'duties': <String, Object?>{
                'type': 'array',
                'maxItems': 20,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'groupId',
                    'duty',
                    'expiresAtMillis',
                    'sourceHash',
                    'grantedBy',
                    'grantedAtMillis',
                  ],
                  'properties': <String, Object?>{
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'duty': <String, Object?>{
                      'enum': <Object?>[
                        'lead',
                        'pacer',
                        'sweep',
                      ],
                    },
                    'expiresAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'grantedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'grantedAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'assistanceSettings': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'runtime',
        'preferences',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'runtime': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'status',
                'configuration',
              ],
              'properties': <String, Object?>{
                'status': <String, Object?>{
                  'enum': <Object?>[
                    'enabled',
                    'paused',
                  ],
                },
                'configuration': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'routes',
                    'deliveryPolicy',
                    'responseDeadline',
                    'outcomes',
                  ],
                  'properties': <String, Object?>{
                    'routes': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 3,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'catchEventSms',
                          'catchEventRcs',
                          'organizerEventWhatsapp',
                        ],
                      },
                    },
                    'deliveryPolicy': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'maxAttempts',
                        'maxAttemptsPerRoute',
                        'minimumRetrySeconds',
                      ],
                      'properties': <String, Object?>{
                        'maxAttempts': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 6,
                        },
                        'maxAttemptsPerRoute': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 3,
                        },
                        'minimumRetrySeconds': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 3600,
                        },
                      },
                    },
                    'responseDeadline': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'laterChoices': <String, Object?>{
                      'type': 'array',
                      'maxItems': 17,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'label',
                          'target',
                        ],
                        'properties': <String, Object?>{
                          'label': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                          },
                          'target': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'placeId',
                                  'lateEntry',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'fixedPlace',
                                  },
                                  'placeId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 160,
                                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                  },
                                  'lateEntry': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'allowed',
                                      'hostDecision',
                                      'closed',
                                    ],
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'itineraryId',
                                  'stopId',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'itineraryStop',
                                  },
                                  'itineraryId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 2000,
                                  },
                                  'stopId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 2000,
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'routeId',
                                  'groupId',
                                  'checkpointId',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'groupCheckpoint',
                                  },
                                  'routeId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 2000,
                                  },
                                  'groupId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 160,
                                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                  },
                                  'checkpointId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 2000,
                                  },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    'outcomes': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 6,
                      'items': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'accepted',
                                  'delivered',
                                  'read',
                                  'revoked',
                                ],
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'classification',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'failed',
                              },
                              'classification': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'technical',
                                  'policy',
                                  'suppressed',
                                  'invalidRecipient',
                                ],
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'reason',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'unknown',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'timeout',
                                  'connectionLost',
                                  'workerInterrupted',
                                ],
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'preferences': <String, Object?>{
          'type': 'array',
          'maxItems': 41,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'groupId',
              'preference',
            ],
            'properties': <String, Object?>{
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'preference': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'inherit',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'disabled',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'template',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'configured',
                      },
                      'template': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'version',
                          'setting',
                          'config',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'lateJoin',
                          },
                          'version': <String, Object?>{
                            'const': 1,
                          },
                          'setting': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'authority',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'enabled',
                                  },
                                  'authority': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'observe',
                                      'prepare',
                                      'executeWithinPolicy',
                                    ],
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'reason',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'disabled',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'hostChoice',
                                      'organizerDefault',
                                    ],
                                  },
                                },
                              },
                            ],
                          },
                          'config': <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'destination',
                              'cutoff',
                              'maxMessagesPerEpisode',
                              'minimumMinutesBetweenMessages',
                              'updateOn',
                              'unanswered',
                            ],
                            'properties': <String, Object?>{
                              'destination': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'const': 'confirmedGroupProgress',
                                      },
                                    },
                                  },
                                  <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'object',
                                        'additionalProperties': false,
                                        'required': <Object?>[
                                          'kind',
                                          'placeId',
                                          'lateEntry',
                                        ],
                                        'properties': <String, Object?>{
                                          'kind': <String, Object?>{
                                            'type': 'string',
                                            'const': 'fixedPlace',
                                          },
                                          'placeId': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 160,
                                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                          },
                                          'lateEntry': <String, Object?>{
                                            'type': 'string',
                                            'enum': <Object?>[
                                              'allowed',
                                              'hostDecision',
                                              'closed',
                                            ],
                                          },
                                        },
                                      },
                                      <String, Object?>{
                                        'type': 'object',
                                        'additionalProperties': false,
                                        'required': <Object?>[
                                          'kind',
                                          'itineraryId',
                                          'permittedStopIds',
                                        ],
                                        'properties': <String, Object?>{
                                          'kind': <String, Object?>{
                                            'type': 'string',
                                            'const': 'itineraryStop',
                                          },
                                          'itineraryId': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 2000,
                                          },
                                          'permittedStopIds': <String, Object?>{
                                            'type': 'array',
                                            'minItems': 1,
                                            'maxItems': 1000,
                                            'items': <String, Object?>{
                                              'type': 'string',
                                              'minLength': 1,
                                              'maxLength': 2000,
                                            },
                                            'uniqueItems': true,
                                          },
                                        },
                                      },
                                      <String, Object?>{
                                        'type': 'object',
                                        'additionalProperties': false,
                                        'required': <Object?>[
                                          'kind',
                                          'routeId',
                                          'groupId',
                                          'permittedCheckpointIds',
                                        ],
                                        'properties': <String, Object?>{
                                          'kind': <String, Object?>{
                                            'type': 'string',
                                            'const': 'groupCheckpoint',
                                          },
                                          'routeId': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 2000,
                                          },
                                          'groupId': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 160,
                                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                          },
                                          'permittedCheckpointIds': <String, Object?>{
                                            'type': 'array',
                                            'minItems': 1,
                                            'maxItems': 1000,
                                            'items': <String, Object?>{
                                              'type': 'string',
                                              'minLength': 1,
                                              'maxLength': 2000,
                                            },
                                            'uniqueItems': true,
                                          },
                                        },
                                      },
                                    ],
                                  },
                                ],
                              },
                              'cutoff': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'eventEnd',
                                      },
                                    },
                                  },
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'at',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'time',
                                      },
                                      'at': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 0,
                                        'maximum': 9007199254740991,
                                        'description': 'UTC milliseconds.',
                                      },
                                    },
                                  },
                                ],
                              },
                              'maxMessagesPerEpisode': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 100,
                              },
                              'minimumMinutesBetweenMessages': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 1440,
                              },
                              'updateOn': <String, Object?>{
                                'type': 'string',
                                'const': 'materialGuidanceChange',
                              },
                              'unanswered': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'keepUnknownUntilCutoff',
                                  'hostReviewAtDeadline',
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'unitOutcomes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'unitOutcome',
        'revision',
        'records',
      ],
      'properties': <String, Object?>{
        'unitOutcome': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'completion',
            'score',
            'rank',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'records': <String, Object?>{
          'type': 'array',
          'maxItems': 500,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'unitId',
              'round',
              'outcome',
              'stateRevision',
              'operationId',
              'recordedBy',
              'recordedAt',
            ],
            'properties': <String, Object?>{
              'unitId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2000,
              },
              'round': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 10000,
              },
              'outcome': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'completed',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'completion',
                      },
                      'completed': <String, Object?>{
                        'type': 'boolean',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'score',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'score',
                      },
                      'score': <String, Object?>{
                        'type': 'number',
                        'minimum': -9007199254740991,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'rank',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'rank',
                      },
                      'rank': <String, Object?>{
                        'type': 'number',
                        'minimum': -9007199254740991,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                ],
              },
              'stateRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 2147483647,
              },
              'operationId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'recordedBy': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'recordedAt': <String, Object?>{
                'type': 'object',
                'description': 'Serialized Firestore Timestamp fixture shape.',
                'x-firestore-type': 'timestamp',
                'additionalProperties': false,
                'required': <Object?>[
                  '_seconds',
                  '_nanoseconds',
                ],
                'properties': <String, Object?>{
                  '_seconds': <String, Object?>{
                    'type': 'integer',
                  },
                  '_nanoseconds': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 999999999,
                  },
                },
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'revealControl': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'status',
        'publishedRound',
        'pendingRound',
        'startedAt',
        'countdownSeconds',
        'lastDecisionId',
        'lastAction',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'idle',
            'countingDown',
            'revealed',
          ],
        },
        'publishedRound': <String, Object?>{
          'type': 'integer',
          'minimum': -1,
          'maximum': 100,
        },
        'pendingRound': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 100,
        },
        'startedAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'description': 'Serialized Firestore Timestamp fixture shape.',
              'x-firestore-type': 'timestamp',
              'additionalProperties': false,
              'required': <Object?>[
                '_seconds',
                '_nanoseconds',
              ],
              'properties': <String, Object?>{
                '_seconds': <String, Object?>{
                  'type': 'integer',
                },
                '_nanoseconds': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 999999999,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'countdownSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 300,
        },
        'lastDecisionId': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'lastAction': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'startCountdown',
                'cancelPending',
                'publish',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'allocationState': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'proposals',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'proposals': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'proposalId',
              'attendeeIds',
              'targetUnitId',
              'baseRevision',
              'status',
              'decisionId',
              'publishedRevision',
              'proposedBy',
              'operationId',
              'proposedAt',
              'publishedAt',
            ],
            'properties': <String, Object?>{
              'proposalId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 200,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'attendeeIds': <String, Object?>{
                'type': 'array',
                'minItems': 1,
                'maxItems': 50,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
              },
              'targetUnitId': <String, Object?>{
                'type': 'string',
                'pattern': '^table-[1-9][0-9]*\$',
                'maxLength': 40,
              },
              'baseRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 2147483647,
              },
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'pending',
                  'published',
                  'stale',
                ],
              },
              'decisionId': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'publishedRevision': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 1,
                'maximum': 2147483647,
              },
              'proposedBy': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'operationId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'proposedAt': <String, Object?>{
                'type': 'object',
                'description': 'Serialized Firestore Timestamp fixture shape.',
                'x-firestore-type': 'timestamp',
                'additionalProperties': false,
                'required': <Object?>[
                  '_seconds',
                  '_nanoseconds',
                ],
                'properties': <String, Object?>{
                  '_seconds': <String, Object?>{
                    'type': 'integer',
                  },
                  '_nanoseconds': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 999999999,
                  },
                },
              },
              'publishedAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'description': 'Serialized Firestore Timestamp fixture shape.',
                    'x-firestore-type': 'timestamp',
                    'additionalProperties': false,
                    'required': <Object?>[
                      '_seconds',
                      '_nanoseconds',
                    ],
                    'properties': <String, Object?>{
                      '_seconds': <String, Object?>{
                        'type': 'integer',
                      },
                      '_nanoseconds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 999999999,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'rosterReconciliation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceId',
        'sourceRevision',
        'rows',
        'status',
        'reconciliationRevision',
        'lastOperationId',
        'reconciledBy',
        'reconciledAt',
      ],
      'properties': <String, Object?>{
        'sourceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sourceRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'rows': <String, Object?>{
          'type': 'array',
          'minItems': 2,
          'maxItems': 52,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'outcome',
              'actorId',
            ],
            'properties': <String, Object?>{
              'rowId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'outcome': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'imported',
                  'duplicate',
                  'ambiguous',
                  'failed',
                ],
              },
              'actorId': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pending',
            'reconciled',
          ],
        },
        'reconciliationRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'lastOperationId': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reconciledBy': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reconciledAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'description': 'Serialized Firestore Timestamp fixture shape.',
              'x-firestore-type': 'timestamp',
              'additionalProperties': false,
              'required': <Object?>[
                '_seconds',
                '_nanoseconds',
              ],
              'properties': <String, Object?>{
                '_seconds': <String, Object?>{
                  'type': 'integer',
                },
                '_nanoseconds': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 999999999,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'guestSource': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'simulated',
        'event',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'rosterSnapshot': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 50,
      'description': 'Private frozen roster names and attendance only. No production identity or contact fields.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'displayName',
          'status',
        ],
        'properties': <String, Object?>{
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'expected',
              'present',
            ],
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
  },
};
