// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_runtime_bootstrap_response.schema.json.

const schemaGetEventRuntimeBootstrapCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_runtime_bootstrap_response.schema.json',
  'title': 'GetEventRuntimeBootstrapCallableResponse',
  'description': 'Sanitized event and caller state for the no-download runtime.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'event',
    'participant',
  ],
  'properties': <String, Object?>{
    'event': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'publicRuntimeId',
        'title',
        'startTimeMillis',
        'endTimeMillis',
        'serverTimeMillis',
        'locationName',
        'checkedInCount',
        'runtimeTermsVersion',
        'moduleIds',
        'layout',
        'requiredFieldIds',
        'optionalFieldIds',
        'questionnaireConfig',
        'interactionModel',
        'itinerary',
        'routePlan',
        'livePositions',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'publicRuntimeId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{20,80}\$',
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'startTimeMillis': <String, Object?>{
          'type': 'integer',
        },
        'endTimeMillis': <String, Object?>{
          'type': 'integer',
        },
        'serverTimeMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'locationName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'checkedInCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'runtimeTermsVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'moduleIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 24,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
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
          'description': 'Fresh, privacy-bounded Host/operator positions. Stable account identifiers are never exposed.',
          'type': 'array',
          'maxItems': 20,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'role',
              'latitude',
              'longitude',
              'accuracyMeters',
              'headingDegrees',
              'recordedAtMillis',
              'staleAtMillis',
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
              'accuracyMeters': <String, Object?>{
                'type': <Object?>[
                  'number',
                  'null',
                ],
                'minimum': 0,
                'maximum': 10000,
              },
              'headingDegrees': <String, Object?>{
                'type': <Object?>[
                  'number',
                  'null',
                ],
                'minimum': 0,
                'exclusiveMaximum': 360,
              },
              'recordedAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'staleAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
        'layout': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'layoutId',
                'label',
                'units',
              ],
              'properties': <String, Object?>{
                'layoutId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'units': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 200,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'label',
                      'shape',
                      'capacity',
                      'gridX',
                      'gridY',
                      'order',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'shape': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'round',
                          'rect',
                          'row',
                          'court',
                          'zone',
                        ],
                      },
                      'capacity': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000,
                      },
                      'gridX': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 199,
                      },
                      'gridY': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 199,
                      },
                      'order': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 200,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        'requiredFieldIds': <String, Object?>{
          'description': 'Fields that must be completed before event mode opens: display name plus at most one server-selected pre-event payload. Optional preference fields are never required for entry.',
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
        'optionalFieldIds': <String, Object?>{
          'description': 'Plan-derived event-only answers the guest may provide to improve preference-aware suggestions. Guests may skip them and receive neutral assignments.',
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
        'questionnaireConfig': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
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
          ],
        },
      },
    },
    'participant': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'accessStatus',
            'attendanceStatus',
            'eventId',
            'clubId',
            'organizerId',
            'requiredFieldIds',
            'completedFieldIds',
            'runtimeProfile',
          ],
          'properties': <String, Object?>{
            'eventAttendeeId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 160,
            },
            'accessStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'needsClaim',
                'pendingApproval',
                'needsInput',
                'ready',
                'optedOut',
                'revoked',
              ],
            },
            'attendanceStatus': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                'invited',
                'registered',
                'waitlisted',
                'checkedIn',
                'cancelled',
                null,
              ],
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'clubId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'requiredFieldIds': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
              },
              'maxItems': 10,
            },
            'completedFieldIds': <String, Object?>{
              'type': 'array',
              'items': <String, Object?>{
                'type': 'string',
              },
              'maxItems': 10,
            },
            'requiredDataRequest': <String, Object?>{
              'description': 'Current event-scoped missing-data request. Omitted by older backends.',
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'null',
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'fieldIds',
                    'completedFieldIds',
                    'status',
                    'requestedAtMillis',
                    'expiresAtMillis',
                    'completedAtMillis',
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
                    'requestedAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'expiresAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'completedAtMillis': <String, Object?>{
                      'type': <Object?>[
                        'integer',
                        'null',
                      ],
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
              ],
            },
            'runtimeProfile': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'displayName',
                'gender',
                'interestedInGenders',
                'relationshipGoal',
                'dateOfBirthMillis',
                'paceBand',
                'skillBand',
                'dietaryAndSeatingNotes',
                'questionnaireAnswerIds',
                'teamName',
              ],
              'properties': <String, Object?>{
                'displayName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'gender': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    'man',
                    'woman',
                    'nonBinary',
                    'other',
                    null,
                  ],
                },
                'interestedInGenders': <String, Object?>{
                  'type': 'array',
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'man',
                      'woman',
                      'nonBinary',
                      'other',
                    ],
                  },
                },
                'relationshipGoal': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    'relationship',
                    'casual',
                    'marriage',
                    'friendship',
                    'unsure',
                    null,
                  ],
                },
                'dateOfBirthMillis': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                },
                'paceBand': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    'competitive',
                    'fast',
                    'moderate',
                    'easy',
                    null,
                  ],
                },
                'skillBand': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    'beginner',
                    'intermediate',
                    'advanced',
                    null,
                  ],
                },
                'dietaryAndSeatingNotes': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'minLength': 1,
                  'maxLength': 300,
                },
                'questionnaireAnswerIds': <String, Object?>{
                  'type': 'array',
                  'uniqueItems': true,
                  'maxItems': 8,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                },
                'teamName': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'minLength': 1,
                  'maxLength': 80,
                },
              },
            },
          },
        },
      ],
    },
  },
};
