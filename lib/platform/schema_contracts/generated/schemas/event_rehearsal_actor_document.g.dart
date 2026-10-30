// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_actors.schema.json.

const schemaEventRehearsalActorDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_rehearsal_actors.schema.json',
  'title': 'EventRehearsalActorDocument',
  'description': 'Synthetic participant state stored only for an isolated rehearsal.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventRehearsalActors',
  'x-firestore-path': 'eventRehearsalActors/{actorDocumentId}',
  'x-document-id-field': 'id',
  'x-owner': 'event rehearsal callables',
  'required': <Object?>[
    'sessionId',
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
    'lastActionAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'actorId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'persona': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'firstTimer',
        'regular',
        'quiet',
        'connector',
        'external',
        'sparseProfile',
        'accessibilityNeeds',
        'walkIn',
      ],
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'connectionState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'connected',
        'disconnected',
      ],
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'optedOut': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'keepApartActorIds': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'helpRequested': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'promptCompleted': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'layoutUnitId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^table-[1-9][0-9]*\$',
          'maxLength': 40,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'confirmedLayoutUnitId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^table-[1-9][0-9]*\$',
          'maxLength': 40,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'lastActionAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'untrackedHelpRequested': <String, Object?>{
      'type': 'boolean',
      'description': 'Preserves a pre-existing help flag without fabricating a typed request. New actors initialize false.',
      'x-catch-ownership': 'server-only',
    },
    'visit': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'attendanceRevision',
        'checkedInAtMillis',
        'accountabilityRevision',
        'resolution',
      ],
      'properties': <String, Object?>{
        'attendanceRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
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
        'accountabilityRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'resolution': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'disposition',
                'visitRevision',
                'checkedInAtMillis',
                'resolvedAtMillis',
                'resolvedBy',
              ],
              'properties': <String, Object?>{
                'disposition': <String, Object?>{
                  'enum': <Object?>[
                    'returned',
                    'departed',
                  ],
                },
                'visitRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'checkedInAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'resolvedAtMillis': <String, Object?>{
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
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'participation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'episodeRevision',
        'state',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'episodeRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'state': <String, Object?>{
          'enum': <Object?>[
            'active',
            'departed',
            'pending',
          ],
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'groupMembership': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'episodeId',
        'revision',
        'accepted',
        'transfer',
        'createdAt',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
        },
        'episodeId': <String, Object?>{
          'type': 'string',
          'pattern': '^episode:[a-f0-9]{64}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
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
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'updatedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'assignmentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
          'description': 'Membership revision of the last placement, accepted transfer or removal. Proposals preserve it; absent legacy evidence cannot authorize group directions.',
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'requiredData': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'profileRevision',
        'completedFieldIds',
        'requestRevision',
        'request',
      ],
      'properties': <String, Object?>{
        'profileRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
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
        'requestRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'request': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'revision',
                'sourceHash',
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
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
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
                  ],
                },
                'requestedAt': <String, Object?>{
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
  },
};
