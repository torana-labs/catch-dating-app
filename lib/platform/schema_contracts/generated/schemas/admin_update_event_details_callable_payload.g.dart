// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_update_event_details_payload.schema.json.

const schemaAdminUpdateEventDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_update_event_details_payload.schema.json',
  'title': 'AdminUpdateEventDetailsCallablePayload',
  'description': 'Callable payload accepted by adminUpdateEventDetails. This edits low-risk app-facing canonical event fields through an audited admin callable.',
  'x-callable-shape': 'patch',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'fields',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'description': <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        'photoUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'distanceKm': <String, Object?>{
          'type': 'number',
          'minimum': 0,
          'maximum': 100,
        },
        'pace': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'easy',
            'moderate',
            'fast',
            'competitive',
          ],
        },
        'crossPathsDiscoveryEnabled': <String, Object?>{
          'type': 'boolean',
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
        'hostPilotReview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'realEvent',
            'expectedRevision',
          ],
          'properties': <String, Object?>{
            'realEvent': <String, Object?>{
              'type': 'boolean',
            },
            'expectedRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
      },
    },
  },
};
