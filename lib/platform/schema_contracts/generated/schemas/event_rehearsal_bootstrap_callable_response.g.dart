// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_rehearsal_bootstrap_response.schema.json.

const schemaEventRehearsalBootstrapCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_rehearsal_bootstrap_response.schema.json',
  'title': 'EventRehearsalBootstrapCallableResponse',
  'description': 'Host projection of a rehearsal session, synthetic actors, and bounded action history.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'session',
    'actors',
    'actions',
    'guestUrl',
    'canUseInternalFaults',
  ],
  'properties': <String, Object?>{
    'session': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'organizerId',
        'sourceEventId',
        'scenarioId',
        'seed',
        'actorCount',
        'actionCount',
        'status',
        'setup',
        'setupRevision',
        'runtimeRevision',
        'activeStepIndex',
        'virtualNowMillis',
        'faultId',
        'expiresAtMillis',
        'virtualStartedAtMillis',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
        },
        'sourceEventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
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
        'actorCount': <String, Object?>{
          'type': 'integer',
        },
        'actionCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 500,
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
        'setupRevision': <String, Object?>{
          'type': 'integer',
        },
        'runtimeRevision': <String, Object?>{
          'type': 'integer',
        },
        'activeStepIndex': <String, Object?>{
          'type': 'integer',
        },
        'virtualNowMillis': <String, Object?>{
          'type': 'integer',
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
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
        },
        'virtualStartedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'guestSource': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'simulated',
            'event',
          ],
        },
      },
    },
    'actors': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'actorId',
          'displayName',
          'persona',
          'status',
          'guestMoment',
          'optedOut',
          'keepApartActorIds',
          'helpRequested',
          'promptCompleted',
          'layoutUnitId',
          'confirmedLayoutUnitId',
        ],
        'properties': <String, Object?>{
          'actorId': <String, Object?>{
            'type': 'string',
          },
          'displayName': <String, Object?>{
            'type': 'string',
          },
          'persona': <String, Object?>{
            'type': 'string',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'expected',
              'present',
              'late',
              'noShow',
              'departed',
              'returned',
              'disconnected',
              'walkIn',
              'ambiguousClaim',
            ],
          },
          'connectionState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'connected',
              'disconnected',
            ],
          },
          'guestMoment': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'welcome',
              'checkIn',
              'firstHello',
              'assignment',
              'rotation',
              'pause',
              'reveal',
              'afterglow',
              'complete',
            ],
          },
          'optedOut': <String, Object?>{
            'type': 'boolean',
          },
          'keepApartActorIds': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
            },
          },
          'helpRequested': <String, Object?>{
            'type': 'boolean',
          },
          'promptCompleted': <String, Object?>{
            'type': 'boolean',
          },
          'layoutUnitId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'confirmedLayoutUnitId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'assistance': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'intention',
              'latestMessageId',
            ],
            'properties': <String, Object?>{
              'intention': <String, Object?>{
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
                        'const': 'unknown',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'claimedEta',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'onMyWay',
                      },
                      'claimedEta': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                            'description': 'UTC milliseconds.',
                          },
                          <String, Object?>{
                            'type': 'null',
                            'const': null,
                          },
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'target',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'joinLater',
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
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'notComing',
                      },
                    },
                  },
                ],
              },
              'latestMessageId': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'pattern': '^outbox:[a-f0-9]{64}\$',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
          'assistanceMessage': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'messageId',
                  'intentId',
                  'intentRevision',
                  'text',
                  'choices',
                  'lifecycle',
                  'expiresAt',
                  'canRespond',
                  'responseChoiceId',
                ],
                'properties': <String, Object?>{
                  'messageId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^outbox:[a-f0-9]{64}\$',
                  },
                  'intentId': <String, Object?>{
                    'type': 'string',
                  },
                  'intentRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'text': <String, Object?>{
                    'type': 'string',
                    'maxLength': 2000,
                  },
                  'choices': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'choiceId',
                        'label',
                      ],
                      'properties': <String, Object?>{
                        'choiceId': <String, Object?>{
                          'type': 'string',
                        },
                        'label': <String, Object?>{
                          'type': 'string',
                          'maxLength': 80,
                        },
                      },
                    },
                  },
                  'lifecycle': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'active',
                      'cancelled',
                      'superseded',
                      'responded',
                    ],
                  },
                  'expiresAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'canRespond': <String, Object?>{
                    'type': 'boolean',
                  },
                  'responseChoiceId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'assistanceDelivery': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'conflictingEvidence',
                  'attempts',
                ],
                'properties': <String, Object?>{
                  'conflictingEvidence': <String, Object?>{
                    'type': 'boolean',
                  },
                  'attempts': <String, Object?>{
                    'type': 'array',
                    'maxItems': 6,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'attemptId',
                        'routeId',
                        'status',
                      ],
                      'properties': <String, Object?>{
                        'attemptId': <String, Object?>{
                          'type': 'string',
                        },
                        'routeId': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'catchEventSms',
                            'catchEventRcs',
                            'organizerEventWhatsapp',
                          ],
                        },
                        'status': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'notDispatched',
                            'reserved',
                            'unknown',
                            'accepted',
                            'delivered',
                            'read',
                            'failed',
                            'revoked',
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
          'assistanceAutomation': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'clockId',
              'status',
              'plan',
              'outcomes',
              'nextOutcomeIndex',
              'evaluation',
            ],
            'properties': <String, Object?>{
              'clockId': <String, Object?>{
                'type': 'string',
                'pattern': '^clock:[a-f0-9]{64}\$',
              },
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'enabled',
                  'paused',
                ],
              },
              'plan': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'policy',
                  'guidance',
                  'departureConfirmed',
                  'responseDeadline',
                  'routes',
                  'deliveryPolicy',
                ],
                'properties': <String, Object?>{
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
                    'description': 'Explicit observe, prepare, execute or disabled practice mode. Absence preserves earlier executable recipes.',
                  },
                  'policy': <String, Object?>{
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
                  'guidance': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'revision',
                      'destination',
                      'materialKey',
                      'text',
                      'validUntil',
                    ],
                    'properties': <String, Object?>{
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                        'description': 'Nonnegative safe integer revision.',
                      },
                      'destination': <String, Object?>{
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
                      'materialKey': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      'text': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      'validUntil': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                        'description': 'UTC milliseconds.',
                      },
                    },
                  },
                  'departureConfirmed': <String, Object?>{
                    'type': 'boolean',
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
                },
                'if': <String, Object?>{
                  'properties': <String, Object?>{
                    'policy': <String, Object?>{
                      'properties': <String, Object?>{
                        'unanswered': <String, Object?>{
                          'const': 'hostReviewAtDeadline',
                        },
                      },
                    },
                  },
                },
                'then': <String, Object?>{
                  'properties': <String, Object?>{
                    'responseDeadline': <String, Object?>{
                      'type': 'integer',
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
              'nextOutcomeIndex': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 6,
              },
              'evaluation': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'at',
                      'policy',
                      'delivery',
                    ],
                    'properties': <String, Object?>{
                      'at': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'policy': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'anyOf': <Object?>[
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
                                    'const': 'resolved',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'joined',
                                      'declined',
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
                                    'const': 'cancelled',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'eventClosed',
                                      'notAdmitted',
                                      'policyDisabled',
                                      'participationInactive',
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
                                    'const': 'expired',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'cutoff',
                                      'lateEntryClosed',
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
                                    'const': 'wait',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'departureUnconfirmed',
                                      'attendanceUnknown',
                                      'guidanceUnavailable',
                                      'throttled',
                                      'unchanged',
                                      'participationUnknown',
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
                                  'guidance',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'hostDecision',
                                  },
                                  'reason': <String, Object?>{
                                    'type': 'string',
                                    'enum': <Object?>[
                                      'unreachable',
                                      'entryDecision',
                                      'missingInformation',
                                    ],
                                  },
                                  'guidance': <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'object',
                                        'additionalProperties': false,
                                        'required': <Object?>[
                                          'revision',
                                          'destination',
                                          'materialKey',
                                          'text',
                                          'validUntil',
                                        ],
                                        'properties': <String, Object?>{
                                          'revision': <String, Object?>{
                                            'type': 'integer',
                                            'minimum': 0,
                                            'maximum': 9007199254740991,
                                            'description': 'Nonnegative safe integer revision.',
                                          },
                                          'destination': <String, Object?>{
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
                                          'materialKey': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 2000,
                                          },
                                          'text': <String, Object?>{
                                            'type': 'string',
                                            'minLength': 1,
                                            'maxLength': 2000,
                                          },
                                          'validUntil': <String, Object?>{
                                            'type': 'integer',
                                            'minimum': 0,
                                            'maximum': 9007199254740991,
                                            'description': 'UTC milliseconds.',
                                          },
                                        },
                                      },
                                      <String, Object?>{
                                        'type': 'null',
                                        'const': null,
                                      },
                                    ],
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'guidance',
                                  'messageKey',
                                  'shouldSend',
                                  'nextEvaluationAt',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'type': 'string',
                                    'const': 'update',
                                  },
                                  'guidance': <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'revision',
                                      'destination',
                                      'materialKey',
                                      'text',
                                      'validUntil',
                                    ],
                                    'properties': <String, Object?>{
                                      'revision': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 0,
                                        'maximum': 9007199254740991,
                                        'description': 'Nonnegative safe integer revision.',
                                      },
                                      'destination': <String, Object?>{
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
                                      'materialKey': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'text': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'validUntil': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 0,
                                        'maximum': 9007199254740991,
                                        'description': 'UTC milliseconds.',
                                      },
                                    },
                                  },
                                  'messageKey': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 2000,
                                  },
                                  'shouldSend': <String, Object?>{
                                    'type': 'boolean',
                                  },
                                  'nextEvaluationAt': <String, Object?>{
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
                                },
                              },
                            ],
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'delivery': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'paused',
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
                                'const': 'notApplicable',
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
                                'const': 'scriptExhausted',
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
                                'const': 'stop',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'responded',
                                  'cancelled',
                                  'superseded',
                                  'expired',
                                  'eventClosed',
                                  'permissionRevoked',
                                  'guestPresent',
                                  'guestDeclined',
                                  'notAdmitted',
                                  'hostStopped',
                                  'participationInactive',
                                ],
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'attemptIds',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'delivered',
                              },
                              'attemptIds': <String, Object?>{
                                'type': 'array',
                                'maxItems': 6,
                                'items': <String, Object?>{
                                  'type': 'string',
                                },
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'attemptIds',
                              'notBefore',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'reconcile',
                              },
                              'attemptIds': <String, Object?>{
                                'type': 'array',
                                'maxItems': 6,
                                'items': <String, Object?>{
                                  'type': 'string',
                                },
                              },
                              'notBefore': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
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
                                'const': 'refreshFacts',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'eventFactsStale',
                                  'routeFactsStale',
                                ],
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'notBefore',
                              'reason',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'wait',
                              },
                              'notBefore': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
                              },
                              'reason': <String, Object?>{
                                'const': 'retryBackoff',
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
                                'const': 'hostDecision',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'noEligibleRoute',
                                  'attemptLimit',
                                  'policyRejected',
                                  'recipientNeedsReview',
                                  'providerOwnsFallback',
                                  'conflictingDeliveryEvidence',
                                  'historyUnavailable',
                                  'configurationUnavailable',
                                ],
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'origin': <String, Object?>{
                'const': 'eventSettings',
                'description': 'Server-owned event configuration enrollment. Absence preserves the explicitly configured per-guest recipe.',
              },
            },
          },
          'requiredData': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'sourceHash',
              'profileRevision',
              'requestRevision',
              'availableFieldIds',
              'completedFieldIds',
              'request',
            ],
            'properties': <String, Object?>{
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'profileRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'requestRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'availableFieldIds': <String, Object?>{
                'type': 'array',
                'uniqueItems': true,
                'maxItems': 10,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'displayName',
                    'gender',
                    'interestedInGenders',
                    'relationshipGoal',
                    'dateOfBirth',
                    'paceBand',
                    'skillBand',
                    'dietaryAndSeatingNotes',
                    'questionnaireAnswerIds',
                    'teamName',
                  ],
                },
              },
              'completedFieldIds': <String, Object?>{
                'type': 'array',
                'uniqueItems': true,
                'maxItems': 10,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'displayName',
                    'gender',
                    'interestedInGenders',
                    'relationshipGoal',
                    'dateOfBirth',
                    'paceBand',
                    'skillBand',
                    'dietaryAndSeatingNotes',
                    'questionnaireAnswerIds',
                    'teamName',
                  ],
                },
              },
              'request': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'revision',
                      'fieldIds',
                      'completedFieldIds',
                      'status',
                      'requestedAt',
                      'expiresAt',
                      'completedAt',
                    ],
                    'properties': <String, Object?>{
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 9007199254740991,
                      },
                      'fieldIds': <String, Object?>{
                        'type': 'array',
                        'uniqueItems': true,
                        'minItems': 1,
                        'maxItems': 10,
                        'items': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'displayName',
                            'gender',
                            'interestedInGenders',
                            'relationshipGoal',
                            'dateOfBirth',
                            'paceBand',
                            'skillBand',
                            'dietaryAndSeatingNotes',
                            'questionnaireAnswerIds',
                            'teamName',
                          ],
                        },
                      },
                      'completedFieldIds': <String, Object?>{
                        'type': 'array',
                        'uniqueItems': true,
                        'maxItems': 10,
                        'items': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'displayName',
                            'gender',
                            'interestedInGenders',
                            'relationshipGoal',
                            'dateOfBirth',
                            'paceBand',
                            'skillBand',
                            'dietaryAndSeatingNotes',
                            'questionnaireAnswerIds',
                            'teamName',
                          ],
                        },
                      },
                      'status': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'pending',
                          'completed',
                          'expired',
                        ],
                      },
                      'requestedAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'expiresAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'completedAt': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 9007199254740991,
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
    },
    'actions': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'clientActionId',
          'actorId',
          'kind',
          'name',
          'runtimeRevision',
          'virtualNowMillis',
        ],
        'properties': <String, Object?>{
          'clientActionId': <String, Object?>{
            'type': 'string',
          },
          'actorId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'kind': <String, Object?>{
            'type': 'string',
          },
          'name': <String, Object?>{
            'type': 'string',
          },
          'runtimeRevision': <String, Object?>{
            'type': 'integer',
          },
          'virtualNowMillis': <String, Object?>{
            'type': 'integer',
          },
        },
      },
    },
    'guestUrl': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'canUseInternalFaults': <String, Object?>{
      'type': 'boolean',
    },
    'helpRequests': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'coverage',
        'cases',
        'untrackedActorIds',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'coverage': <String, Object?>{
          'const': 'boundedSession',
        },
        'cases': <String, Object?>{
          'type': 'array',
          'maxItems': 500,
          'items': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'caseId',
                  'revision',
                  'sourceHash',
                  'availability',
                  'attendeeId',
                  'category',
                  'receivedAt',
                  'status',
                  'resolution',
                  'canChange',
                  'assignment',
                ],
                'properties': <String, Object?>{
                  'caseId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'availability': <String, Object?>{
                    'const': 'current',
                  },
                  'attendeeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'category': <String, Object?>{
                    'enum': <Object?>[
                      'eventLogistics',
                      'accessibility',
                      'other',
                    ],
                  },
                  'receivedAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'status': <String, Object?>{
                    'const': 'open',
                  },
                  'resolution': <String, Object?>{
                    'type': 'null',
                  },
                  'canChange': <String, Object?>{
                    'const': true,
                  },
                  'assignment': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'unassigned',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'uid',
                          'authority',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'assigned',
                          },
                          'uid': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'authority': <String, Object?>{
                            'enum': <Object?>[
                              'current',
                              'revoked',
                            ],
                          },
                        },
                      },
                    ],
                  },
                  'displayName': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 120,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'caseId',
                  'revision',
                  'sourceHash',
                  'availability',
                  'attendeeId',
                  'category',
                  'receivedAt',
                  'status',
                  'resolution',
                  'canChange',
                  'assignment',
                ],
                'properties': <String, Object?>{
                  'caseId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'availability': <String, Object?>{
                    'const': 'current',
                  },
                  'attendeeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'category': <String, Object?>{
                    'enum': <Object?>[
                      'eventLogistics',
                      'accessibility',
                      'other',
                    ],
                  },
                  'receivedAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'status': <String, Object?>{
                    'const': 'resolved',
                  },
                  'resolution': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'outcome',
                      'actorUid',
                      'at',
                    ],
                    'properties': <String, Object?>{
                      'outcome': <String, Object?>{
                        'enum': <Object?>[
                          'resolved',
                          'declined',
                        ],
                      },
                      'actorUid': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'at': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                  'canChange': <String, Object?>{
                    'const': false,
                  },
                  'assignment': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'unassigned',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'uid',
                          'authority',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'assigned',
                          },
                          'uid': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'authority': <String, Object?>{
                            'enum': <Object?>[
                              'current',
                              'revoked',
                            ],
                          },
                        },
                      },
                    ],
                  },
                  'displayName': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 120,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'caseId',
                  'revision',
                  'sourceHash',
                  'availability',
                  'attendeeId',
                  'category',
                  'receivedAt',
                  'status',
                  'resolution',
                  'canChange',
                  'assignment',
                ],
                'properties': <String, Object?>{
                  'caseId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'availability': <String, Object?>{
                    'const': 'sourceChanged',
                  },
                  'attendeeId': <String, Object?>{
                    'type': 'null',
                  },
                  'category': <String, Object?>{
                    'enum': <Object?>[
                      'eventLogistics',
                      'accessibility',
                      'other',
                    ],
                  },
                  'receivedAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'status': <String, Object?>{
                    'enum': <Object?>[
                      'open',
                      'resolved',
                    ],
                  },
                  'resolution': <String, Object?>{
                    'type': 'null',
                  },
                  'canChange': <String, Object?>{
                    'const': false,
                  },
                  'assignment': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'unavailable',
                      },
                    },
                  },
                  'displayName': <String, Object?>{
                    'type': 'null',
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'caseId',
                  'revision',
                  'sourceHash',
                  'availability',
                  'attendeeId',
                  'category',
                  'receivedAt',
                  'status',
                  'resolution',
                  'canChange',
                  'assignment',
                ],
                'properties': <String, Object?>{
                  'caseId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'null',
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'availability': <String, Object?>{
                    'const': 'legacy',
                  },
                  'attendeeId': <String, Object?>{
                    'type': 'null',
                  },
                  'category': <String, Object?>{
                    'enum': <Object?>[
                      'eventLogistics',
                      'accessibility',
                      'other',
                    ],
                  },
                  'receivedAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'status': <String, Object?>{
                    'enum': <Object?>[
                      'open',
                      'resolved',
                    ],
                  },
                  'resolution': <String, Object?>{
                    'type': 'null',
                  },
                  'canChange': <String, Object?>{
                    'const': false,
                  },
                  'assignment': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'unavailable',
                      },
                    },
                  },
                  'displayName': <String, Object?>{
                    'type': 'null',
                  },
                },
              },
            ],
          },
        },
        'untrackedActorIds': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'managerOptions': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'actorUid',
                'managers',
              ],
              'properties': <String, Object?>{
                'actorUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'managers': <String, Object?>{
                  'type': 'array',
                  'maxItems': 42,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'uid',
                      'displayName',
                    ],
                    'properties': <String, Object?>{
                      'uid': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'displayName': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 120,
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
      },
    },
    'deliveryReviews': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'coverage',
        'deliveries',
      ],
      'properties': <String, Object?>{
        'context': <String, Object?>{
          'allOf': <Object?>[
            <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'eventId',
                    'organizerId',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'const': 'live',
                    },
                    'eventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'organizerId': <String, Object?>{
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
                    'mode',
                    'rehearsalId',
                    'virtualEventId',
                    'clockId',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'const': 'rehearsal',
                    },
                    'rehearsalId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'virtualEventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'clockId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                  },
                },
              ],
            },
            <String, Object?>{
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'rehearsal',
                },
              },
            },
          ],
        },
        'coverage': <String, Object?>{
          'const': 'currentActorMessages',
        },
        'deliveries': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'allOf': <Object?>[
              <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'messageId',
                      'revision',
                      'reviewHash',
                      'createdAt',
                      'expiresAt',
                      'lifecycle',
                      'deliveryStatus',
                      'attempts',
                      'coordination',
                      'handling',
                      'availability',
                      'attendeeId',
                      'actions',
                      'purpose',
                    ],
                    'properties': <String, Object?>{
                      'messageId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^outbox:[a-f0-9]{64}\$',
                      },
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'reviewHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'createdAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'expiresAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'lifecycle': <String, Object?>{
                        'enum': <Object?>[
                          'active',
                          'cancelled',
                          'superseded',
                          'responded',
                        ],
                      },
                      'deliveryStatus': <String, Object?>{
                        'enum': <Object?>[
                          'notSubmitted',
                          'reserved',
                          'unknown',
                          'accepted',
                          'delivered',
                          'read',
                          'failed',
                          'notDispatched',
                          'conflictingEvidence',
                          'revoked',
                        ],
                      },
                      'attempts': <String, Object?>{
                        'type': 'array',
                        'maxItems': 6,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'channel',
                            'state',
                            'at',
                          ],
                          'properties': <String, Object?>{
                            'channel': <String, Object?>{
                              'enum': <Object?>[
                                'sms',
                                'whatsapp',
                                'rcs',
                              ],
                            },
                            'state': <String, Object?>{
                              'enum': <Object?>[
                                'reserved',
                                'unknown',
                                'accepted',
                                'delivered',
                                'read',
                                'failed',
                                'notDispatched',
                                'revoked',
                              ],
                            },
                            'at': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                          },
                        },
                      },
                      'coordination': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'untracked',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'phase',
                              'reason',
                              'dueAt',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'tracked',
                              },
                              'phase': <String, Object?>{
                                'enum': <Object?>[
                                  'queued',
                                  'retry',
                                  'receipt',
                                  'review',
                                  'complete',
                                ],
                              },
                              'reason': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 80,
                                  },
                                  <String, Object?>{
                                    'type': 'null',
                                  },
                                ],
                              },
                              'dueAt': <String, Object?>{
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
                            },
                          },
                        ],
                      },
                      'handling': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'automatic',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'actorUid',
                              'at',
                              'authority',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'manual',
                              },
                              'actorUid': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                              },
                              'at': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
                              },
                              'authority': <String, Object?>{
                                'enum': <Object?>[
                                  'current',
                                  'revoked',
                                ],
                              },
                            },
                          },
                        ],
                      },
                      'availability': <String, Object?>{
                        'const': 'current',
                      },
                      'attendeeId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'actions': <String, Object?>{
                        'type': 'array',
                        'maxItems': 1,
                        'uniqueItems': true,
                        'items': <String, Object?>{
                          'const': 'manualHandoff',
                        },
                      },
                      'purpose': <String, Object?>{
                        'enum': <Object?>[
                          'joiningUpdate',
                          'joiningInstructions',
                          'planChanged',
                          'guestRequirement',
                          'assignmentChanged',
                          'participationCheck',
                          'eventCancelled',
                          'eventFinished',
                          'followUp',
                        ],
                      },
                      'displayName': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 120,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'messageId',
                      'revision',
                      'reviewHash',
                      'createdAt',
                      'expiresAt',
                      'lifecycle',
                      'deliveryStatus',
                      'attempts',
                      'coordination',
                      'handling',
                      'availability',
                      'attendeeId',
                      'actions',
                      'purpose',
                    ],
                    'properties': <String, Object?>{
                      'messageId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^outbox:[a-f0-9]{64}\$',
                      },
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'reviewHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'createdAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'expiresAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'lifecycle': <String, Object?>{
                        'enum': <Object?>[
                          'active',
                          'cancelled',
                          'superseded',
                          'responded',
                        ],
                      },
                      'deliveryStatus': <String, Object?>{
                        'enum': <Object?>[
                          'notSubmitted',
                          'reserved',
                          'unknown',
                          'accepted',
                          'delivered',
                          'read',
                          'failed',
                          'notDispatched',
                          'conflictingEvidence',
                          'revoked',
                        ],
                      },
                      'attempts': <String, Object?>{
                        'type': 'array',
                        'maxItems': 6,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'channel',
                            'state',
                            'at',
                          ],
                          'properties': <String, Object?>{
                            'channel': <String, Object?>{
                              'enum': <Object?>[
                                'sms',
                                'whatsapp',
                                'rcs',
                              ],
                            },
                            'state': <String, Object?>{
                              'enum': <Object?>[
                                'reserved',
                                'unknown',
                                'accepted',
                                'delivered',
                                'read',
                                'failed',
                                'notDispatched',
                                'revoked',
                              ],
                            },
                            'at': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                          },
                        },
                      },
                      'coordination': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'untracked',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'phase',
                              'reason',
                              'dueAt',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'tracked',
                              },
                              'phase': <String, Object?>{
                                'enum': <Object?>[
                                  'queued',
                                  'retry',
                                  'receipt',
                                  'review',
                                  'complete',
                                ],
                              },
                              'reason': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 80,
                                  },
                                  <String, Object?>{
                                    'type': 'null',
                                  },
                                ],
                              },
                              'dueAt': <String, Object?>{
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
                            },
                          },
                        ],
                      },
                      'handling': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'automatic',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'actorUid',
                              'at',
                              'authority',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'manual',
                              },
                              'actorUid': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                              },
                              'at': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
                              },
                              'authority': <String, Object?>{
                                'enum': <Object?>[
                                  'current',
                                  'revoked',
                                ],
                              },
                            },
                          },
                        ],
                      },
                      'availability': <String, Object?>{
                        'const': 'sourceChanged',
                      },
                      'attendeeId': <String, Object?>{
                        'type': 'null',
                      },
                      'actions': <String, Object?>{
                        'type': 'array',
                        'maxItems': 0,
                        'items': <String, Object?>{
                          'const': 'manualHandoff',
                        },
                      },
                      'purpose': <String, Object?>{
                        'enum': <Object?>[
                          'joiningUpdate',
                          'joiningInstructions',
                          'planChanged',
                          'guestRequirement',
                          'assignmentChanged',
                          'participationCheck',
                          'eventCancelled',
                          'eventFinished',
                          'followUp',
                        ],
                      },
                      'displayName': <String, Object?>{
                        'type': 'null',
                      },
                    },
                  },
                ],
              },
              <String, Object?>{
                'properties': <String, Object?>{
                  'availability': <String, Object?>{
                    'const': 'current',
                  },
                  'purpose': <String, Object?>{
                    'const': 'joiningUpdate',
                  },
                  'coordination': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'untracked',
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
    'accountabilityReviews': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'coverage',
        'rows',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'coverage': <String, Object?>{
          'const': 'boundedSession',
        },
        'rows': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'episodeId',
              'sourceHash',
              'visitRevision',
              'checkedInAtMillis',
              'revision',
              'disposition',
              'availability',
              'canResolve',
            ],
            'properties': <String, Object?>{
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'episodeId': <String, Object?>{
                'type': 'string',
                'pattern': '^episode:[a-f0-9]{64}\$',
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'visitRevision': <String, Object?>{
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
              'checkedInAtMillis': <String, Object?>{
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
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'disposition': <String, Object?>{
                'enum': <Object?>[
                  'returned',
                  'departed',
                  'unresolved',
                ],
              },
              'availability': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'ready',
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
                        'const': 'unavailable',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'notApplicable',
                          'notCheckedIn',
                          'visitNotRecorded',
                          'invalidSource',
                        ],
                      },
                    },
                  },
                ],
              },
              'canResolve': <String, Object?>{
                'type': 'boolean',
              },
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
            },
          },
        },
      },
    },
    'membershipReviews': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'actorUid',
        'coverage',
        'receivingOperatorIds',
        'rows',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'coverage': <String, Object?>{
          'const': 'boundedSession',
        },
        'receivingOperatorIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'maxItems': 92,
        },
        'rows': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'sourceHash',
              'serverTime',
              'revision',
              'episodeId',
              'participationRevision',
              'freshness',
              'ready',
              'accepted',
              'transfer',
              'transferState',
              'groups',
              'actions',
              'availability',
            ],
            'properties': <String, Object?>{
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'serverTime': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'episodeId': <String, Object?>{
                'anyOf': <Object?>[
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
              'participationRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'freshness': <String, Object?>{
                'enum': <Object?>[
                  'uninitialized',
                  'current',
                  'sourceChanged',
                ],
              },
              'ready': <String, Object?>{
                'type': 'boolean',
              },
              'accepted': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'groupId',
                      'groupSourceHash',
                      'responsibleOperatorId',
                      'acceptedAt',
                    ],
                    'properties': <String, Object?>{
                      'groupId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'groupSourceHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'responsibleOperatorId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'acceptedAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'transfer': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'transferId',
                          'from',
                          'to',
                          'targetSourceHash',
                          'receivingOperatorId',
                          'requestedBy',
                          'requestedAt',
                          'expiresAt',
                          'status',
                          'resolvedAt',
                          'resolvedBy',
                        ],
                        'properties': <String, Object?>{
                          'transferId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'from': <String, Object?>{
                            'anyOf': <Object?>[
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
                          'to': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'targetSourceHash': <String, Object?>{
                            'type': 'string',
                            'pattern': '^[a-f0-9]{64}\$',
                          },
                          'receivingOperatorId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          'requestedBy': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          'requestedAt': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'expiresAt': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'status': <String, Object?>{
                            'const': 'pending',
                          },
                          'resolvedAt': <String, Object?>{
                            'type': 'null',
                          },
                          'resolvedBy': <String, Object?>{
                            'type': 'null',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'transferId',
                          'from',
                          'to',
                          'targetSourceHash',
                          'receivingOperatorId',
                          'requestedBy',
                          'requestedAt',
                          'expiresAt',
                          'status',
                          'resolvedAt',
                          'resolvedBy',
                        ],
                        'properties': <String, Object?>{
                          'transferId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'from': <String, Object?>{
                            'anyOf': <Object?>[
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
                          'to': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'targetSourceHash': <String, Object?>{
                            'type': 'string',
                            'pattern': '^[a-f0-9]{64}\$',
                          },
                          'receivingOperatorId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          'requestedBy': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          'requestedAt': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'expiresAt': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'status': <String, Object?>{
                            'enum': <Object?>[
                              'accepted',
                              'rejected',
                              'cancelled',
                            ],
                          },
                          'resolvedAt': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'resolvedBy': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                        },
                      },
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'transferState': <String, Object?>{
                'enum': <Object?>[
                  'none',
                  'pending',
                  'expired',
                  'sourceChanged',
                  'accepted',
                  'rejected',
                  'cancelled',
                ],
              },
              'groups': <String, Object?>{
                'type': 'array',
                'maxItems': 40,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'groupId',
                    'label',
                  ],
                  'properties': <String, Object?>{
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'label': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 240,
                    },
                  },
                },
              },
              'actions': <String, Object?>{
                'type': 'array',
                'uniqueItems': true,
                'maxItems': 6,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'place',
                    'propose',
                    'accept',
                    'reject',
                    'cancel',
                    'leave',
                  ],
                },
              },
              'availability': <String, Object?>{
                'enum': <Object?>[
                  'ready',
                  'notApplicable',
                  'participationNotRecorded',
                  'invalidSource',
                ],
              },
            },
          },
        },
      },
    },
    'movementReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'organizerId',
        'clockId',
        'setupRevision',
        'runtimeRevision',
        'actorUid',
        'serverTime',
        'groupId',
        'groups',
        'progress',
        'roster',
        'selected',
        'checkpoint',
        'history',
        'nextBeforeRevision',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'setupRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'runtimeRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'groupId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'groups': <String, Object?>{
          'type': 'array',
          'maxItems': 41,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'groupId',
              'label',
            ],
            'properties': <String, Object?>{
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
          },
        },
        'progress': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'sourceHash',
            'eventOpen',
            'runtimeLive',
            'destinations',
            'current',
            'routeDecision',
            'guidance',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 500,
            },
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'eventOpen': <String, Object?>{
              'type': 'boolean',
            },
            'runtimeLive': <String, Object?>{
              'type': 'boolean',
            },
            'destinations': <String, Object?>{
              'type': 'array',
              'maxItems': 41,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'alternativeId',
                  'target',
                  'label',
                  'text',
                ],
                'properties': <String, Object?>{
                  'alternativeId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^alternative:[a-f0-9]{64}\$',
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
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'text': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 4000,
                  },
                },
              },
            },
            'current': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'sessionId',
                    'clockId',
                    'groupId',
                    'progressRevision',
                    'departure',
                    'report',
                  ],
                  'properties': <String, Object?>{
                    'sessionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'clockId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^clock:[a-f0-9]{64}\$',
                    },
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'progressRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 500,
                    },
                    'departure': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'sourceHash',
                        'destination',
                        'confirmedAt',
                        'confirmedBy',
                        'operationId',
                        'roster',
                        'checkpointRequest',
                      ],
                      'properties': <String, Object?>{
                        'sourceHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'destination': <String, Object?>{
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
                        'confirmedAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'confirmedBy': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'operationId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'roster': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'members',
                                'selectionHash',
                              ],
                              'properties': <String, Object?>{
                                'members': <String, Object?>{
                                  'type': 'array',
                                  'maxItems': 50,
                                  'items': <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'attendeeId',
                                      'displayName',
                                      'visitHash',
                                      'episodeId',
                                      'membershipHash',
                                    ],
                                    'properties': <String, Object?>{
                                      'attendeeId': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 180,
                                      },
                                      'displayName': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 180,
                                      },
                                      'visitHash': <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^[a-f0-9]{64}\$',
                                      },
                                      'episodeId': <String, Object?>{
                                        'anyOf': <Object?>[
                                          <String, Object?>{
                                            'type': 'string',
                                            'pattern': '^episode:[a-f0-9]{64}\$',
                                          },
                                          <String, Object?>{
                                            'type': 'null',
                                          },
                                        ],
                                      },
                                      'membershipHash': <String, Object?>{
                                        'anyOf': <Object?>[
                                          <String, Object?>{
                                            'type': 'string',
                                            'pattern': '^[a-f0-9]{64}\$',
                                          },
                                          <String, Object?>{
                                            'type': 'null',
                                          },
                                        ],
                                      },
                                    },
                                  },
                                },
                                'selectionHash': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^[a-f0-9]{64}\$',
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'checkpointRequest': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'responsibleOperatorId',
                                'dueAt',
                              ],
                              'properties': <String, Object?>{
                                'responsibleOperatorId': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 128,
                                  'pattern': '^[^/]+\$',
                                },
                                'dueAt': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
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
                    'report': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'revision',
                            'rosterHash',
                            'accountedFor',
                            'reportedAt',
                            'reportedBy',
                            'correctionReason',
                          ],
                          'properties': <String, Object?>{
                            'revision': <String, Object?>{
                              'type': 'integer',
                              'minimum': 1,
                              'maximum': 9007199254740991,
                            },
                            'rosterHash': <String, Object?>{
                              'type': 'string',
                              'pattern': '^[a-f0-9]{64}\$',
                            },
                            'accountedFor': <String, Object?>{
                              'type': 'array',
                              'maxItems': 50,
                              'uniqueItems': true,
                              'items': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                              },
                            },
                            'reportedAt': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                            'reportedBy': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 180,
                            },
                            'correctionReason': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                  'pattern': '\\S',
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'assignment': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'operationId',
                        'responsibleOperatorId',
                        'previousResponsibleOperatorId',
                        'assignedBy',
                        'assignedAt',
                        'reason',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'responsibleOperatorId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[^/]+\$',
                        },
                        'previousResponsibleOperatorId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[^/]+\$',
                        },
                        'assignedBy': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[^/]+\$',
                        },
                        'assignedAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reason': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                          'pattern': '\\S',
                        },
                        'operationId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                      },
                    },
                    'closeout': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'previousRevision',
                        'operationId',
                        'changedBy',
                        'changedAt',
                        'reason',
                        'decision',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'previousRevision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'changedBy': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[^/]+\$',
                        },
                        'changedAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reason': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                          'pattern': '\\S',
                        },
                        'decision': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'report',
                                'dispositions',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'const': 'close',
                                },
                                'report': <String, Object?>{
                                  'type': 'object',
                                  'additionalProperties': false,
                                  'required': <Object?>[
                                    'revision',
                                    'rosterHash',
                                    'accountedFor',
                                    'reportedAt',
                                    'reportedBy',
                                    'correctionReason',
                                  ],
                                  'properties': <String, Object?>{
                                    'revision': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 1,
                                      'maximum': 9007199254740991,
                                    },
                                    'rosterHash': <String, Object?>{
                                      'type': 'string',
                                      'pattern': '^[a-f0-9]{64}\$',
                                    },
                                    'accountedFor': <String, Object?>{
                                      'type': 'array',
                                      'maxItems': 50,
                                      'uniqueItems': true,
                                      'items': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 180,
                                      },
                                    },
                                    'reportedAt': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 0,
                                      'maximum': 9007199254740991,
                                    },
                                    'reportedBy': <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 180,
                                    },
                                    'correctionReason': <String, Object?>{
                                      'anyOf': <Object?>[
                                        <String, Object?>{
                                          'type': 'string',
                                          'minLength': 1,
                                          'maxLength': 500,
                                          'pattern': '\\S',
                                        },
                                        <String, Object?>{
                                          'type': 'null',
                                        },
                                      ],
                                    },
                                  },
                                },
                                'dispositions': <String, Object?>{
                                  'type': 'array',
                                  'maxItems': 50,
                                  'items': <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'disposition',
                                      'revision',
                                      'resolvedAt',
                                      'resolvedBy',
                                      'sourceHash',
                                      'attendeeId',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'const': 'resolved',
                                      },
                                      'disposition': <String, Object?>{
                                        'enum': <Object?>[
                                          'returned',
                                          'departed',
                                        ],
                                      },
                                      'revision': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 1,
                                        'maximum': 9007199254740991,
                                      },
                                      'resolvedAt': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 0,
                                        'maximum': 9007199254740991,
                                      },
                                      'resolvedBy': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 128,
                                        'pattern': '^[^/]+\$',
                                      },
                                      'sourceHash': <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^[a-f0-9]{64}\$',
                                      },
                                      'attendeeId': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 160,
                                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                      },
                                    },
                                  },
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
                                  'const': 'reopen',
                                },
                              },
                            },
                          ],
                        },
                        'operationId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
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
            'routeDecision': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'sessionId',
                    'clockId',
                    'groupId',
                    'progressRevision',
                    'previousRevision',
                    'departureRevision',
                    'sourceHash',
                    'alternativeId',
                    'destination',
                    'decisionId',
                    'operationId',
                    'decidedBy',
                    'decidedAt',
                  ],
                  'properties': <String, Object?>{
                    'sessionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'clockId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^clock:[a-f0-9]{64}\$',
                    },
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'progressRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 2,
                      'maximum': 500,
                    },
                    'previousRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 499,
                    },
                    'departureRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 499,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'alternativeId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^alternative:[a-f0-9]{64}\$',
                    },
                    'destination': <String, Object?>{
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
                    'decisionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'operationId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'decidedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'decidedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'guidance': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'destination',
                    'materialKey',
                    'text',
                    'validUntil',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                      'description': 'Nonnegative safe integer revision.',
                    },
                    'destination': <String, Object?>{
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
                    'materialKey': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'text': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'validUntil': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                      'description': 'UTC milliseconds.',
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
        'roster': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'sourceHash',
            'members',
            'unavailable',
            'coverage',
          ],
          'properties': <String, Object?>{
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'members': <String, Object?>{
              'type': 'array',
              'maxItems': 50,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'attendeeId',
                  'displayName',
                  'visitHash',
                  'episodeId',
                  'membershipHash',
                ],
                'properties': <String, Object?>{
                  'attendeeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'displayName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'visitHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'episodeId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'pattern': '^episode:[a-f0-9]{64}\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'membershipHash': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
            },
            'unavailable': <String, Object?>{
              'type': 'array',
              'maxItems': 50,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'attendeeId',
                  'reason',
                ],
                'properties': <String, Object?>{
                  'attendeeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'reason': <String, Object?>{
                    'enum': <Object?>[
                      'notCheckedIn',
                      'participationUnavailable',
                      'membershipUnavailable',
                      'invalidSource',
                    ],
                  },
                },
              },
            },
            'coverage': <String, Object?>{
              'const': 'boundedSession',
            },
          },
        },
        'checkpoint': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'progressRevision',
                'checkpointId',
                'sourceHash',
                'revision',
                'availability',
                'report',
                'request',
                'departure',
              ],
              'properties': <String, Object?>{
                'progressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 500,
                },
                'checkpointId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'availability': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'rosterId',
                        'label',
                        'reportStatus',
                        'members',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'ready',
                        },
                        'rosterId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^departure-roster:[a-f0-9]{64}\$',
                        },
                        'label': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'reportStatus': <String, Object?>{
                          'enum': <Object?>[
                            'unreported',
                            'partial',
                            'complete',
                          ],
                        },
                        'members': <String, Object?>{
                          'type': 'array',
                          'maxItems': 1000,
                          'items': <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'attendeeId',
                              'observation',
                              'visit',
                            ],
                            'properties': <String, Object?>{
                              'attendeeId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                              },
                              'observation': <String, Object?>{
                                'enum': <Object?>[
                                  'accountedFor',
                                  'unconfirmed',
                                ],
                              },
                              'visit': <String, Object?>{
                                'oneOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'const': 'current',
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
                                        'const': 'unavailable',
                                      },
                                      'reason': <String, Object?>{
                                        'enum': <Object?>[
                                          'registrationMissing',
                                          'visitChanged',
                                          'notCheckedIn',
                                          'invalidSource',
                                        ],
                                      },
                                    },
                                  },
                                ],
                              },
                              'disposition': <String, Object?>{
                                'description': 'Visit-bound event accountability evidence. A resolved disposition never means arrival at this checkpoint.',
                                'oneOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'const': 'unresolved',
                                      },
                                    },
                                  },
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'disposition',
                                      'revision',
                                      'resolvedAt',
                                      'resolvedBy',
                                      'sourceHash',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'const': 'resolved',
                                      },
                                      'disposition': <String, Object?>{
                                        'enum': <Object?>[
                                          'returned',
                                          'departed',
                                        ],
                                      },
                                      'revision': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 1,
                                        'maximum': 9007199254740991,
                                      },
                                      'resolvedAt': <String, Object?>{
                                        'type': 'integer',
                                        'minimum': 0,
                                        'maximum': 9007199254740991,
                                      },
                                      'resolvedBy': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'sourceHash': <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^[a-f0-9]{64}\$',
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
                                        'const': 'unavailable',
                                      },
                                      'reason': <String, Object?>{
                                        'enum': <Object?>[
                                          'registrationMissing',
                                          'visitChanged',
                                          'notCheckedIn',
                                          'invalidSource',
                                          'beforeDeparture',
                                        ],
                                      },
                                    },
                                  },
                                ],
                              },
                              'displayName': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 120,
                              },
                            },
                          },
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
                          'const': 'unavailable',
                        },
                        'reason': <String, Object?>{
                          'enum': <Object?>[
                            'rosterNotRecorded',
                            'destinationNotRecorded',
                            'differentCheckpoint',
                            'notCheckpoint',
                            'setupChanged',
                          ],
                        },
                      },
                    },
                  ],
                },
                'report': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'rosterHash',
                        'accountedFor',
                        'reportedAt',
                        'reportedBy',
                        'correctionReason',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'rosterHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'accountedFor': <String, Object?>{
                          'type': 'array',
                          'maxItems': 50,
                          'uniqueItems': true,
                          'items': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                        },
                        'reportedAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reportedBy': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'correctionReason': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                              'pattern': '\\S',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'request': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'responsibleOperatorId',
                            'dueAt',
                            'state',
                            'ownerAvailability',
                          ],
                          'properties': <String, Object?>{
                            'responsibleOperatorId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 128,
                              'pattern': '^[^/]+\$',
                            },
                            'dueAt': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                            'state': <String, Object?>{
                              'enum': <Object?>[
                                'awaitingReport',
                                'overdue',
                                'discrepancy',
                                'sourceUnavailable',
                              ],
                            },
                            'ownerAvailability': <String, Object?>{
                              'enum': <Object?>[
                                'current',
                                'needsReassignment',
                              ],
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'responsibleOperatorId',
                            'dueAt',
                            'state',
                            'ownerAvailability',
                          ],
                          'properties': <String, Object?>{
                            'responsibleOperatorId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 128,
                              'pattern': '^[^/]+\$',
                            },
                            'dueAt': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                            'state': <String, Object?>{
                              'enum': <Object?>[
                                'complete',
                                'closedOut',
                              ],
                            },
                            'ownerAvailability': <String, Object?>{
                              'const': 'notRequired',
                            },
                          },
                        },
                      ],
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'departure': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'sourceHash',
                    'destination',
                    'confirmedAt',
                    'confirmedBy',
                    'operationId',
                    'roster',
                    'checkpointRequest',
                  ],
                  'properties': <String, Object?>{
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'destination': <String, Object?>{
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
                    'confirmedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'confirmedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'operationId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'roster': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'members',
                            'selectionHash',
                          ],
                          'properties': <String, Object?>{
                            'members': <String, Object?>{
                              'type': 'array',
                              'maxItems': 50,
                              'items': <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'attendeeId',
                                  'displayName',
                                  'visitHash',
                                  'episodeId',
                                  'membershipHash',
                                ],
                                'properties': <String, Object?>{
                                  'attendeeId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 180,
                                  },
                                  'displayName': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 180,
                                  },
                                  'visitHash': <String, Object?>{
                                    'type': 'string',
                                    'pattern': '^[a-f0-9]{64}\$',
                                  },
                                  'episodeId': <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^episode:[a-f0-9]{64}\$',
                                      },
                                      <String, Object?>{
                                        'type': 'null',
                                      },
                                    ],
                                  },
                                  'membershipHash': <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^[a-f0-9]{64}\$',
                                      },
                                      <String, Object?>{
                                        'type': 'null',
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            'selectionHash': <String, Object?>{
                              'type': 'string',
                              'pattern': '^[a-f0-9]{64}\$',
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'checkpointRequest': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'responsibleOperatorId',
                            'dueAt',
                          ],
                          'properties': <String, Object?>{
                            'responsibleOperatorId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 128,
                              'pattern': '^[^/]+\$',
                            },
                            'dueAt': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
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
                'assignment': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'sourceHash',
                        'change',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'sourceHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'change': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'revision',
                                'operationId',
                                'responsibleOperatorId',
                                'previousResponsibleOperatorId',
                                'assignedBy',
                                'assignedAt',
                                'reason',
                              ],
                              'properties': <String, Object?>{
                                'revision': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 1,
                                  'maximum': 9007199254740991,
                                },
                                'responsibleOperatorId': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 128,
                                  'pattern': '^[^/]+\$',
                                },
                                'previousResponsibleOperatorId': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 128,
                                  'pattern': '^[^/]+\$',
                                },
                                'assignedBy': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 128,
                                  'pattern': '^[^/]+\$',
                                },
                                'assignedAt': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                  'pattern': '\\S',
                                },
                                'operationId': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 180,
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
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'closeout': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'sourceHash',
                        'change',
                        'state',
                        'eligibility',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'sourceHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'change': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'revision',
                                'previousRevision',
                                'operationId',
                                'changedBy',
                                'changedAt',
                                'reason',
                                'decision',
                              ],
                              'properties': <String, Object?>{
                                'revision': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 1,
                                  'maximum': 9007199254740991,
                                },
                                'previousRevision': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
                                },
                                'changedBy': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 128,
                                  'pattern': '^[^/]+\$',
                                },
                                'changedAt': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                  'pattern': '\\S',
                                },
                                'decision': <String, Object?>{
                                  'oneOf': <Object?>[
                                    <String, Object?>{
                                      'type': 'object',
                                      'additionalProperties': false,
                                      'required': <Object?>[
                                        'kind',
                                        'report',
                                        'dispositions',
                                      ],
                                      'properties': <String, Object?>{
                                        'kind': <String, Object?>{
                                          'const': 'close',
                                        },
                                        'report': <String, Object?>{
                                          'type': 'object',
                                          'additionalProperties': false,
                                          'required': <Object?>[
                                            'revision',
                                            'rosterHash',
                                            'accountedFor',
                                            'reportedAt',
                                            'reportedBy',
                                            'correctionReason',
                                          ],
                                          'properties': <String, Object?>{
                                            'revision': <String, Object?>{
                                              'type': 'integer',
                                              'minimum': 1,
                                              'maximum': 9007199254740991,
                                            },
                                            'rosterHash': <String, Object?>{
                                              'type': 'string',
                                              'pattern': '^[a-f0-9]{64}\$',
                                            },
                                            'accountedFor': <String, Object?>{
                                              'type': 'array',
                                              'maxItems': 50,
                                              'uniqueItems': true,
                                              'items': <String, Object?>{
                                                'type': 'string',
                                                'minLength': 1,
                                                'maxLength': 180,
                                              },
                                            },
                                            'reportedAt': <String, Object?>{
                                              'type': 'integer',
                                              'minimum': 0,
                                              'maximum': 9007199254740991,
                                            },
                                            'reportedBy': <String, Object?>{
                                              'type': 'string',
                                              'minLength': 1,
                                              'maxLength': 180,
                                            },
                                            'correctionReason': <String, Object?>{
                                              'anyOf': <Object?>[
                                                <String, Object?>{
                                                  'type': 'string',
                                                  'minLength': 1,
                                                  'maxLength': 500,
                                                  'pattern': '\\S',
                                                },
                                                <String, Object?>{
                                                  'type': 'null',
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        'dispositions': <String, Object?>{
                                          'type': 'array',
                                          'maxItems': 50,
                                          'items': <String, Object?>{
                                            'type': 'object',
                                            'additionalProperties': false,
                                            'required': <Object?>[
                                              'kind',
                                              'disposition',
                                              'revision',
                                              'resolvedAt',
                                              'resolvedBy',
                                              'sourceHash',
                                              'attendeeId',
                                            ],
                                            'properties': <String, Object?>{
                                              'kind': <String, Object?>{
                                                'const': 'resolved',
                                              },
                                              'disposition': <String, Object?>{
                                                'enum': <Object?>[
                                                  'returned',
                                                  'departed',
                                                ],
                                              },
                                              'revision': <String, Object?>{
                                                'type': 'integer',
                                                'minimum': 1,
                                                'maximum': 9007199254740991,
                                              },
                                              'resolvedAt': <String, Object?>{
                                                'type': 'integer',
                                                'minimum': 0,
                                                'maximum': 9007199254740991,
                                              },
                                              'resolvedBy': <String, Object?>{
                                                'type': 'string',
                                                'minLength': 1,
                                                'maxLength': 128,
                                                'pattern': '^[^/]+\$',
                                              },
                                              'sourceHash': <String, Object?>{
                                                'type': 'string',
                                                'pattern': '^[a-f0-9]{64}\$',
                                              },
                                              'attendeeId': <String, Object?>{
                                                'type': 'string',
                                                'minLength': 1,
                                                'maxLength': 160,
                                                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                              },
                                            },
                                          },
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
                                          'const': 'reopen',
                                        },
                                      },
                                    },
                                  ],
                                },
                                'operationId': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 180,
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'state': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'enum': <Object?>[
                                    'open',
                                    'reopened',
                                    'closedOut',
                                    'superseded',
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
                                  'const': 'needsReview',
                                },
                                'reason': <String, Object?>{
                                  'enum': <Object?>[
                                    'sourceUnavailable',
                                    'reportChanged',
                                    'dispositionChanged',
                                  ],
                                },
                              },
                            },
                          ],
                        },
                        'eligibility': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'const': 'ready',
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'reason',
                                'attendeeIds',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'const': 'unavailable',
                                },
                                'reason': <String, Object?>{
                                  'enum': <Object?>[
                                    'sourceUnavailable',
                                    'reportMissing',
                                    'reportComplete',
                                    'unresolvedMembers',
                                    'alreadyClosed',
                                  ],
                                },
                                'attendeeIds': <String, Object?>{
                                  'type': 'array',
                                  'maxItems': 1000,
                                  'uniqueItems': true,
                                  'items': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 160,
                                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'accountabilityReviews': <String, Object?>{
                  'type': 'array',
                  'maxItems': 50,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'attendeeId',
                      'visitHash',
                      'sourceHash',
                      'revision',
                      'disposition',
                      'availability',
                      'canResolve',
                    ],
                    'properties': <String, Object?>{
                      'attendeeId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'visitHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'sourceHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'disposition': <String, Object?>{
                        'enum': <Object?>[
                          'returned',
                          'departed',
                          'unresolved',
                        ],
                      },
                      'availability': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'ready',
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
                                'const': 'unavailable',
                              },
                              'reason': <String, Object?>{
                                'enum': <Object?>[
                                  'notApplicable',
                                  'notCheckedIn',
                                  'departureNotRecorded',
                                  'notOnDeparture',
                                  'visitChanged',
                                  'setupChanged',
                                  'differentCheckpoint',
                                  'destinationNotRecorded',
                                  'notCheckpoint',
                                ],
                              },
                            },
                          },
                        ],
                      },
                      'canResolve': <String, Object?>{
                        'type': 'boolean',
                      },
                    },
                  },
                },
                'reporterOptions': <String, Object?>{
                  'description': 'Current original-group reporter choices for the rehearsal manager.',
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'actorUid',
                        'sourceHash',
                        'validUntil',
                        'reporters',
                      ],
                      'properties': <String, Object?>{
                        'actorUid': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[^/]+\$',
                        },
                        'sourceHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'validUntil': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reporters': <String, Object?>{
                          'type': 'array',
                          'maxItems': 92,
                          'items': <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'operatorId',
                              'displayName',
                              'validUntil',
                            ],
                            'properties': <String, Object?>{
                              'operatorId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 128,
                                'pattern': '^[^/]+\$',
                              },
                              'displayName': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 120,
                              },
                              'validUntil': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
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
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'history': <String, Object?>{
          'type': 'array',
          'maxItems': 25,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'progressRevision',
              'destination',
              'confirmedAt',
              'rosterSize',
              'reportRevision',
              'accountedForCount',
              'checkpointRequest',
            ],
            'properties': <String, Object?>{
              'progressRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 500,
              },
              'destination': <String, Object?>{
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
              'confirmedAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'rosterSize': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 50,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'reportRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'accountedForCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 50,
              },
              'checkpointRequest': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'responsibleOperatorId',
                      'dueAt',
                    ],
                    'properties': <String, Object?>{
                      'responsibleOperatorId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 128,
                        'pattern': '^[^/]+\$',
                      },
                      'dueAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
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
        'nextBeforeRevision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 501,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'selected': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'sessionId',
                'clockId',
                'groupId',
                'progressRevision',
                'departure',
                'report',
              ],
              'properties': <String, Object?>{
                'sessionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'clockId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^clock:[a-f0-9]{64}\$',
                },
                'groupId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'progressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 500,
                },
                'departure': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'sourceHash',
                    'destination',
                    'confirmedAt',
                    'confirmedBy',
                    'operationId',
                    'roster',
                    'checkpointRequest',
                  ],
                  'properties': <String, Object?>{
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'destination': <String, Object?>{
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
                    'confirmedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'confirmedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'operationId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'roster': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'members',
                            'selectionHash',
                          ],
                          'properties': <String, Object?>{
                            'members': <String, Object?>{
                              'type': 'array',
                              'maxItems': 50,
                              'items': <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'attendeeId',
                                  'displayName',
                                  'visitHash',
                                  'episodeId',
                                  'membershipHash',
                                ],
                                'properties': <String, Object?>{
                                  'attendeeId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 180,
                                  },
                                  'displayName': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 180,
                                  },
                                  'visitHash': <String, Object?>{
                                    'type': 'string',
                                    'pattern': '^[a-f0-9]{64}\$',
                                  },
                                  'episodeId': <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^episode:[a-f0-9]{64}\$',
                                      },
                                      <String, Object?>{
                                        'type': 'null',
                                      },
                                    ],
                                  },
                                  'membershipHash': <String, Object?>{
                                    'anyOf': <Object?>[
                                      <String, Object?>{
                                        'type': 'string',
                                        'pattern': '^[a-f0-9]{64}\$',
                                      },
                                      <String, Object?>{
                                        'type': 'null',
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            'selectionHash': <String, Object?>{
                              'type': 'string',
                              'pattern': '^[a-f0-9]{64}\$',
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'checkpointRequest': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'responsibleOperatorId',
                            'dueAt',
                          ],
                          'properties': <String, Object?>{
                            'responsibleOperatorId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 128,
                              'pattern': '^[^/]+\$',
                            },
                            'dueAt': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
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
                'report': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'revision',
                        'rosterHash',
                        'accountedFor',
                        'reportedAt',
                        'reportedBy',
                        'correctionReason',
                      ],
                      'properties': <String, Object?>{
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'rosterHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                        'accountedFor': <String, Object?>{
                          'type': 'array',
                          'maxItems': 50,
                          'uniqueItems': true,
                          'items': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                        },
                        'reportedAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reportedBy': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'correctionReason': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                              'pattern': '\\S',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'assignment': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'operationId',
                    'responsibleOperatorId',
                    'previousResponsibleOperatorId',
                    'assignedBy',
                    'assignedAt',
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'responsibleOperatorId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[^/]+\$',
                    },
                    'previousResponsibleOperatorId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[^/]+\$',
                    },
                    'assignedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[^/]+\$',
                    },
                    'assignedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                      'pattern': '\\S',
                    },
                    'operationId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                  },
                },
                'closeout': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'previousRevision',
                    'operationId',
                    'changedBy',
                    'changedAt',
                    'reason',
                    'decision',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'previousRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'changedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[^/]+\$',
                    },
                    'changedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'reason': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                      'pattern': '\\S',
                    },
                    'decision': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'report',
                            'dispositions',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'close',
                            },
                            'report': <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'revision',
                                'rosterHash',
                                'accountedFor',
                                'reportedAt',
                                'reportedBy',
                                'correctionReason',
                              ],
                              'properties': <String, Object?>{
                                'revision': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 1,
                                  'maximum': 9007199254740991,
                                },
                                'rosterHash': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^[a-f0-9]{64}\$',
                                },
                                'accountedFor': <String, Object?>{
                                  'type': 'array',
                                  'maxItems': 50,
                                  'uniqueItems': true,
                                  'items': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 180,
                                  },
                                },
                                'reportedAt': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
                                },
                                'reportedBy': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 180,
                                },
                                'correctionReason': <String, Object?>{
                                  'anyOf': <Object?>[
                                    <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 500,
                                      'pattern': '\\S',
                                    },
                                    <String, Object?>{
                                      'type': 'null',
                                    },
                                  ],
                                },
                              },
                            },
                            'dispositions': <String, Object?>{
                              'type': 'array',
                              'maxItems': 50,
                              'items': <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'disposition',
                                  'revision',
                                  'resolvedAt',
                                  'resolvedBy',
                                  'sourceHash',
                                  'attendeeId',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'const': 'resolved',
                                  },
                                  'disposition': <String, Object?>{
                                    'enum': <Object?>[
                                      'returned',
                                      'departed',
                                    ],
                                  },
                                  'revision': <String, Object?>{
                                    'type': 'integer',
                                    'minimum': 1,
                                    'maximum': 9007199254740991,
                                  },
                                  'resolvedAt': <String, Object?>{
                                    'type': 'integer',
                                    'minimum': 0,
                                    'maximum': 9007199254740991,
                                  },
                                  'resolvedBy': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 128,
                                    'pattern': '^[^/]+\$',
                                  },
                                  'sourceHash': <String, Object?>{
                                    'type': 'string',
                                    'pattern': '^[a-f0-9]{64}\$',
                                  },
                                  'attendeeId': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 160,
                                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                                  },
                                },
                              },
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
                              'const': 'reopen',
                            },
                          },
                        },
                      ],
                    },
                    'operationId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
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
        'staffReview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'clockId',
            'revision',
            'sourceHash',
            'hostUid',
            'actorUid',
            'practiceOperatorId',
            'serverTime',
            'canAssign',
            'operators',
            'groups',
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
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'hostUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'actorUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'practiceOperatorId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'serverTime': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'canAssign': <String, Object?>{
              'type': 'boolean',
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
            'groups': <String, Object?>{
              'type': 'array',
              'maxItems': 21,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'groupId',
                  'label',
                  'sourceHash',
                  'permissions',
                  'validUntil',
                  'availableDuties',
                ],
                'properties': <String, Object?>{
                  'groupId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'permissions': <String, Object?>{
                    'type': 'array',
                    'maxItems': 5,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'enum': <Object?>[
                        'readProgress',
                        'confirmDeparture',
                        'transferGroup',
                        'recordCheckpoint',
                        'resolveAccountability',
                      ],
                    },
                  },
                  'validUntil': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'availableDuties': <String, Object?>{
                    'type': 'array',
                    'maxItems': 3,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'enum': <Object?>[
                        'lead',
                        'pacer',
                        'sweep',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'staffReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'revision',
        'sourceHash',
        'hostUid',
        'actorUid',
        'practiceOperatorId',
        'serverTime',
        'canAssign',
        'operators',
        'groups',
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
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'hostUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'practiceOperatorId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'canAssign': <String, Object?>{
          'type': 'boolean',
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
        'groups': <String, Object?>{
          'type': 'array',
          'maxItems': 21,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'groupId',
              'label',
              'sourceHash',
              'permissions',
              'validUntil',
              'availableDuties',
            ],
            'properties': <String, Object?>{
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'permissions': <String, Object?>{
                'type': 'array',
                'maxItems': 5,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'readProgress',
                    'confirmDeparture',
                    'transferGroup',
                    'recordCheckpoint',
                    'resolveAccountability',
                  ],
                },
              },
              'validUntil': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'availableDuties': <String, Object?>{
                'type': 'array',
                'maxItems': 3,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'lead',
                    'pacer',
                    'sweep',
                  ],
                },
              },
            },
          },
        },
      },
    },
    'settingsReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'setupRevision',
        'runtimeRevision',
        'sourceHash',
        'serverTime',
        'canConfigure',
        'runtime',
        'suggested',
        'groups',
      ],
      'properties': <String, Object?>{
        'context': <String, Object?>{
          'allOf': <Object?>[
            <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'mode',
                    'eventId',
                    'organizerId',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'const': 'live',
                    },
                    'eventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'organizerId': <String, Object?>{
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
                    'mode',
                    'rehearsalId',
                    'virtualEventId',
                    'clockId',
                  ],
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'type': 'string',
                      'const': 'rehearsal',
                    },
                    'rehearsalId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'virtualEventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'clockId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                  },
                },
              ],
            },
            <String, Object?>{
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'rehearsal',
                },
              },
            },
          ],
        },
        'setupRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'runtimeRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'canConfigure': <String, Object?>{
          'type': 'boolean',
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
        'suggested': <String, Object?>{
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
        'groups': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 41,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'groupId',
              'label',
              'preference',
              'effective',
              'status',
              'origin',
              'setup',
            ],
            'properties': <String, Object?>{
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
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
              'effective': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
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
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'status': <String, Object?>{
                'enum': <Object?>[
                  'unconfigured',
                  'disabled',
                  'sourceChanged',
                  'configured',
                ],
              },
              'origin': <String, Object?>{
                'enum': <Object?>[
                  'none',
                  'event',
                  'group',
                ],
              },
              'setup': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'eventEnd',
                  'destinations',
                ],
                'properties': <String, Object?>{
                  'eventEnd': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'destinations': <String, Object?>{
                    'type': 'array',
                    'maxItems': 41,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'alternativeId',
                        'target',
                        'label',
                        'text',
                      ],
                      'properties': <String, Object?>{
                        'alternativeId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^alternative:[a-f0-9]{64}\$',
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
                        'label': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        'text': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 4000,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'outcomeReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'unitOutcome',
        'revision',
        'unitIds',
        'records',
      ],
      'properties': <String, Object?>{
        'unitOutcome': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
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
        'unitIds': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 2000,
          },
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
              'recordedAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
            },
          },
        },
      },
    },
    'revealReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'status',
        'publishedRound',
        'pendingRound',
        'startedAt',
        'countdownSeconds',
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
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'countdownSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 300,
        },
      },
    },
    'allocationReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'unitIds',
        'assignments',
        'proposals',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'unitIds': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^table-[1-9][0-9]*\$',
            'maxLength': 40,
          },
        },
        'assignments': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'unitId',
            ],
            'properties': <String, Object?>{
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'unitId': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'pattern': '^table-[1-9][0-9]*\$',
                    'maxLength': 40,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
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
              'proposedAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'publishedAt': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
                'maximum': 9007199254740991,
              },
            },
          },
        },
      },
    },
    'rosterReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceId',
        'sourceRevision',
        'status',
        'reconciliationRevision',
        'reconciledAt',
        'importedCount',
        'duplicateCount',
        'ambiguousCount',
        'failedCount',
        'rows',
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
        'reconciledAt': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'importedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 50,
        },
        'duplicateCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1,
        },
        'ambiguousCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1,
        },
        'failedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1,
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
      },
    },
  },
  'definitions': <String, Object?>{
    'session': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'organizerId',
        'sourceEventId',
        'scenarioId',
        'seed',
        'actorCount',
        'actionCount',
        'status',
        'setup',
        'setupRevision',
        'runtimeRevision',
        'activeStepIndex',
        'virtualNowMillis',
        'faultId',
        'expiresAtMillis',
        'virtualStartedAtMillis',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
        },
        'sourceEventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
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
        'actorCount': <String, Object?>{
          'type': 'integer',
        },
        'actionCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 500,
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
        'setupRevision': <String, Object?>{
          'type': 'integer',
        },
        'runtimeRevision': <String, Object?>{
          'type': 'integer',
        },
        'activeStepIndex': <String, Object?>{
          'type': 'integer',
        },
        'virtualNowMillis': <String, Object?>{
          'type': 'integer',
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
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
        },
        'virtualStartedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'guestSource': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'simulated',
            'event',
          ],
        },
      },
    },
    'actor': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'actorId',
        'displayName',
        'persona',
        'status',
        'guestMoment',
        'optedOut',
        'keepApartActorIds',
        'helpRequested',
        'promptCompleted',
        'layoutUnitId',
        'confirmedLayoutUnitId',
      ],
      'properties': <String, Object?>{
        'actorId': <String, Object?>{
          'type': 'string',
        },
        'displayName': <String, Object?>{
          'type': 'string',
        },
        'persona': <String, Object?>{
          'type': 'string',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'expected',
            'present',
            'late',
            'noShow',
            'departed',
            'returned',
            'disconnected',
            'walkIn',
            'ambiguousClaim',
          ],
        },
        'connectionState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'connected',
            'disconnected',
          ],
        },
        'guestMoment': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'welcome',
            'checkIn',
            'firstHello',
            'assignment',
            'rotation',
            'pause',
            'reveal',
            'afterglow',
            'complete',
          ],
        },
        'optedOut': <String, Object?>{
          'type': 'boolean',
        },
        'keepApartActorIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
          },
        },
        'helpRequested': <String, Object?>{
          'type': 'boolean',
        },
        'promptCompleted': <String, Object?>{
          'type': 'boolean',
        },
        'layoutUnitId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'confirmedLayoutUnitId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'assistance': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'intention',
            'latestMessageId',
          ],
          'properties': <String, Object?>{
            'intention': <String, Object?>{
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
                      'const': 'unknown',
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'claimedEta',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'onMyWay',
                    },
                    'claimedEta': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                          'description': 'UTC milliseconds.',
                        },
                        <String, Object?>{
                          'type': 'null',
                          'const': null,
                        },
                      ],
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'target',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'joinLater',
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
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'notComing',
                    },
                  },
                },
              ],
            },
            'latestMessageId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^outbox:[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        'assistanceMessage': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'messageId',
                'intentId',
                'intentRevision',
                'text',
                'choices',
                'lifecycle',
                'expiresAt',
                'canRespond',
                'responseChoiceId',
              ],
              'properties': <String, Object?>{
                'messageId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^outbox:[a-f0-9]{64}\$',
                },
                'intentId': <String, Object?>{
                  'type': 'string',
                },
                'intentRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'text': <String, Object?>{
                  'type': 'string',
                  'maxLength': 2000,
                },
                'choices': <String, Object?>{
                  'type': 'array',
                  'maxItems': 20,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'choiceId',
                      'label',
                    ],
                    'properties': <String, Object?>{
                      'choiceId': <String, Object?>{
                        'type': 'string',
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'maxLength': 80,
                      },
                    },
                  },
                },
                'lifecycle': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'active',
                    'cancelled',
                    'superseded',
                    'responded',
                  ],
                },
                'expiresAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'canRespond': <String, Object?>{
                  'type': 'boolean',
                },
                'responseChoiceId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'assistanceDelivery': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'conflictingEvidence',
                'attempts',
              ],
              'properties': <String, Object?>{
                'conflictingEvidence': <String, Object?>{
                  'type': 'boolean',
                },
                'attempts': <String, Object?>{
                  'type': 'array',
                  'maxItems': 6,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'attemptId',
                      'routeId',
                      'status',
                    ],
                    'properties': <String, Object?>{
                      'attemptId': <String, Object?>{
                        'type': 'string',
                      },
                      'routeId': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'catchEventSms',
                          'catchEventRcs',
                          'organizerEventWhatsapp',
                        ],
                      },
                      'status': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'notDispatched',
                          'reserved',
                          'unknown',
                          'accepted',
                          'delivered',
                          'read',
                          'failed',
                          'revoked',
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
        'assistanceAutomation': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'clockId',
            'status',
            'plan',
            'outcomes',
            'nextOutcomeIndex',
            'evaluation',
          ],
          'properties': <String, Object?>{
            'clockId': <String, Object?>{
              'type': 'string',
              'pattern': '^clock:[a-f0-9]{64}\$',
            },
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'enabled',
                'paused',
              ],
            },
            'plan': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'policy',
                'guidance',
                'departureConfirmed',
                'responseDeadline',
                'routes',
                'deliveryPolicy',
              ],
              'properties': <String, Object?>{
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
                  'description': 'Explicit observe, prepare, execute or disabled practice mode. Absence preserves earlier executable recipes.',
                },
                'policy': <String, Object?>{
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
                'guidance': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'destination',
                    'materialKey',
                    'text',
                    'validUntil',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                      'description': 'Nonnegative safe integer revision.',
                    },
                    'destination': <String, Object?>{
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
                    'materialKey': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'text': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'validUntil': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                      'description': 'UTC milliseconds.',
                    },
                  },
                },
                'departureConfirmed': <String, Object?>{
                  'type': 'boolean',
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
              },
              'if': <String, Object?>{
                'properties': <String, Object?>{
                  'policy': <String, Object?>{
                    'properties': <String, Object?>{
                      'unanswered': <String, Object?>{
                        'const': 'hostReviewAtDeadline',
                      },
                    },
                  },
                },
              },
              'then': <String, Object?>{
                'properties': <String, Object?>{
                  'responseDeadline': <String, Object?>{
                    'type': 'integer',
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
            'nextOutcomeIndex': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 6,
            },
            'evaluation': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'at',
                    'policy',
                    'delivery',
                  ],
                  'properties': <String, Object?>{
                    'at': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'policy': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'anyOf': <Object?>[
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
                                  'const': 'resolved',
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'enum': <Object?>[
                                    'joined',
                                    'declined',
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
                                  'const': 'cancelled',
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'enum': <Object?>[
                                    'eventClosed',
                                    'notAdmitted',
                                    'policyDisabled',
                                    'participationInactive',
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
                                  'const': 'expired',
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'enum': <Object?>[
                                    'cutoff',
                                    'lateEntryClosed',
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
                                  'const': 'wait',
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'enum': <Object?>[
                                    'departureUnconfirmed',
                                    'attendanceUnknown',
                                    'guidanceUnavailable',
                                    'throttled',
                                    'unchanged',
                                    'participationUnknown',
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
                                'guidance',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'hostDecision',
                                },
                                'reason': <String, Object?>{
                                  'type': 'string',
                                  'enum': <Object?>[
                                    'unreachable',
                                    'entryDecision',
                                    'missingInformation',
                                  ],
                                },
                                'guidance': <String, Object?>{
                                  'anyOf': <Object?>[
                                    <String, Object?>{
                                      'type': 'object',
                                      'additionalProperties': false,
                                      'required': <Object?>[
                                        'revision',
                                        'destination',
                                        'materialKey',
                                        'text',
                                        'validUntil',
                                      ],
                                      'properties': <String, Object?>{
                                        'revision': <String, Object?>{
                                          'type': 'integer',
                                          'minimum': 0,
                                          'maximum': 9007199254740991,
                                          'description': 'Nonnegative safe integer revision.',
                                        },
                                        'destination': <String, Object?>{
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
                                        'materialKey': <String, Object?>{
                                          'type': 'string',
                                          'minLength': 1,
                                          'maxLength': 2000,
                                        },
                                        'text': <String, Object?>{
                                          'type': 'string',
                                          'minLength': 1,
                                          'maxLength': 2000,
                                        },
                                        'validUntil': <String, Object?>{
                                          'type': 'integer',
                                          'minimum': 0,
                                          'maximum': 9007199254740991,
                                          'description': 'UTC milliseconds.',
                                        },
                                      },
                                    },
                                    <String, Object?>{
                                      'type': 'null',
                                      'const': null,
                                    },
                                  ],
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'guidance',
                                'messageKey',
                                'shouldSend',
                                'nextEvaluationAt',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'update',
                                },
                                'guidance': <String, Object?>{
                                  'type': 'object',
                                  'additionalProperties': false,
                                  'required': <Object?>[
                                    'revision',
                                    'destination',
                                    'materialKey',
                                    'text',
                                    'validUntil',
                                  ],
                                  'properties': <String, Object?>{
                                    'revision': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 0,
                                      'maximum': 9007199254740991,
                                      'description': 'Nonnegative safe integer revision.',
                                    },
                                    'destination': <String, Object?>{
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
                                    'materialKey': <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 2000,
                                    },
                                    'text': <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 2000,
                                    },
                                    'validUntil': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 0,
                                      'maximum': 9007199254740991,
                                      'description': 'UTC milliseconds.',
                                    },
                                  },
                                },
                                'messageKey': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 2000,
                                },
                                'shouldSend': <String, Object?>{
                                  'type': 'boolean',
                                },
                                'nextEvaluationAt': <String, Object?>{
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
                              },
                            },
                          ],
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'delivery': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'paused',
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
                              'const': 'notApplicable',
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
                              'const': 'scriptExhausted',
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
                              'const': 'stop',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'responded',
                                'cancelled',
                                'superseded',
                                'expired',
                                'eventClosed',
                                'permissionRevoked',
                                'guestPresent',
                                'guestDeclined',
                                'notAdmitted',
                                'hostStopped',
                                'participationInactive',
                              ],
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'attemptIds',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'delivered',
                            },
                            'attemptIds': <String, Object?>{
                              'type': 'array',
                              'maxItems': 6,
                              'items': <String, Object?>{
                                'type': 'string',
                              },
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'attemptIds',
                            'notBefore',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'reconcile',
                            },
                            'attemptIds': <String, Object?>{
                              'type': 'array',
                              'maxItems': 6,
                              'items': <String, Object?>{
                                'type': 'string',
                              },
                            },
                            'notBefore': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
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
                              'const': 'refreshFacts',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'eventFactsStale',
                                'routeFactsStale',
                              ],
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'notBefore',
                            'reason',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'wait',
                            },
                            'notBefore': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 9007199254740991,
                            },
                            'reason': <String, Object?>{
                              'const': 'retryBackoff',
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
                              'const': 'hostDecision',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'noEligibleRoute',
                                'attemptLimit',
                                'policyRejected',
                                'recipientNeedsReview',
                                'providerOwnsFallback',
                                'conflictingDeliveryEvidence',
                                'historyUnavailable',
                                'configurationUnavailable',
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'origin': <String, Object?>{
              'const': 'eventSettings',
              'description': 'Server-owned event configuration enrollment. Absence preserves the explicitly configured per-guest recipe.',
            },
          },
        },
        'requiredData': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'sourceHash',
            'profileRevision',
            'requestRevision',
            'availableFieldIds',
            'completedFieldIds',
            'request',
          ],
          'properties': <String, Object?>{
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'profileRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'requestRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'availableFieldIds': <String, Object?>{
              'type': 'array',
              'uniqueItems': true,
              'maxItems': 10,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'displayName',
                  'gender',
                  'interestedInGenders',
                  'relationshipGoal',
                  'dateOfBirth',
                  'paceBand',
                  'skillBand',
                  'dietaryAndSeatingNotes',
                  'questionnaireAnswerIds',
                  'teamName',
                ],
              },
            },
            'completedFieldIds': <String, Object?>{
              'type': 'array',
              'uniqueItems': true,
              'maxItems': 10,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'displayName',
                  'gender',
                  'interestedInGenders',
                  'relationshipGoal',
                  'dateOfBirth',
                  'paceBand',
                  'skillBand',
                  'dietaryAndSeatingNotes',
                  'questionnaireAnswerIds',
                  'teamName',
                ],
              },
            },
            'request': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'fieldIds',
                    'completedFieldIds',
                    'status',
                    'requestedAt',
                    'expiresAt',
                    'completedAt',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'fieldIds': <String, Object?>{
                      'type': 'array',
                      'uniqueItems': true,
                      'minItems': 1,
                      'maxItems': 10,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'displayName',
                          'gender',
                          'interestedInGenders',
                          'relationshipGoal',
                          'dateOfBirth',
                          'paceBand',
                          'skillBand',
                          'dietaryAndSeatingNotes',
                          'questionnaireAnswerIds',
                          'teamName',
                        ],
                      },
                    },
                    'completedFieldIds': <String, Object?>{
                      'type': 'array',
                      'uniqueItems': true,
                      'maxItems': 10,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'displayName',
                          'gender',
                          'interestedInGenders',
                          'relationshipGoal',
                          'dateOfBirth',
                          'paceBand',
                          'skillBand',
                          'dietaryAndSeatingNotes',
                          'questionnaireAnswerIds',
                          'teamName',
                        ],
                      },
                    },
                    'status': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'pending',
                        'completed',
                        'expired',
                      ],
                    },
                    'requestedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'expiresAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'completedAt': <String, Object?>{
                      'type': <Object?>[
                        'integer',
                        'null',
                      ],
                      'minimum': 0,
                      'maximum': 9007199254740991,
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
    'action': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clientActionId',
        'actorId',
        'kind',
        'name',
        'runtimeRevision',
        'virtualNowMillis',
      ],
      'properties': <String, Object?>{
        'clientActionId': <String, Object?>{
          'type': 'string',
        },
        'actorId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'kind': <String, Object?>{
          'type': 'string',
        },
        'name': <String, Object?>{
          'type': 'string',
        },
        'runtimeRevision': <String, Object?>{
          'type': 'integer',
        },
        'virtualNowMillis': <String, Object?>{
          'type': 'integer',
        },
      },
    },
  },
};
