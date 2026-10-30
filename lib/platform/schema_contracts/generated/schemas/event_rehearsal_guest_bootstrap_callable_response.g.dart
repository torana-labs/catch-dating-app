// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_rehearsal_guest_bootstrap_response.schema.json.

const schemaEventRehearsalGuestBootstrapCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_rehearsal_guest_bootstrap_response.schema.json',
  'title': 'EventRehearsalGuestBootstrapCallableResponse',
  'description': 'Sanitized anonymous guest projection for a rehearsal.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'slotToken',
    'session',
    'actor',
    'practiceBanner',
  ],
  'properties': <String, Object?>{
    'slotToken': <String, Object?>{
      'type': 'string',
    },
    'practiceBanner': <String, Object?>{
      'type': 'string',
    },
    'session': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'title',
        'locationName',
        'status',
        'activeStepIndex',
        'virtualNowMillis',
        'attendeePrompt',
        'moduleIds',
        'runtimeRevision',
        'faultId',
      ],
      'properties': <String, Object?>{
        'title': <String, Object?>{
          'type': 'string',
        },
        'locationName': <String, Object?>{
          'type': 'string',
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
        'activeStepIndex': <String, Object?>{
          'type': 'integer',
        },
        'virtualNowMillis': <String, Object?>{
          'type': 'integer',
        },
        'attendeePrompt': <String, Object?>{
          'type': 'string',
        },
        'moduleIds': <String, Object?>{
          'type': 'array',
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
        'runtimeRevision': <String, Object?>{
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
      },
    },
    'actor': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'actorId',
        'displayName',
        'status',
        'guestMoment',
        'optedOut',
        'helpRequested',
        'promptCompleted',
      ],
      'properties': <String, Object?>{
        'actorId': <String, Object?>{
          'type': 'string',
        },
        'displayName': <String, Object?>{
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
        'helpRequested': <String, Object?>{
          'type': 'boolean',
        },
        'promptCompleted': <String, Object?>{
          'type': 'boolean',
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
};
