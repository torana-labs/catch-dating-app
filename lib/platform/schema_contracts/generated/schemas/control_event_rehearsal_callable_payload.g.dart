// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/control_event_rehearsal_payload.schema.json.

const schemaControlEventRehearsalCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/control_event_rehearsal_payload.schema.json',
  'title': 'ControlEventRehearsalCallablePayload',
  'description': 'Host lifecycle or virtual-clock control. Assistance additionally requires the reviewed setup generation so a reset cannot reuse an old runtime revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'expectedRevision',
    'clientActionId',
    'action',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'clientActionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,120}\$',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'markReady',
        'start',
        'pause',
        'resume',
        'advance',
        'previous',
        'advanceClock',
        'complete',
        'assistance',
        'movement',
        'staff',
        'settings',
        'requiredData',
        'outcome',
        'reveal',
        'allocation',
        'roster',
      ],
    },
    'minutes': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 120,
    },
    'assistance': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'plan',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'publish',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
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
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'messageId',
            'outcome',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'dispatch',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'messageId': <String, Object?>{
              'type': 'string',
              'pattern': '^outbox:[a-f0-9]{64}\$',
            },
            'outcome': <String, Object?>{
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
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'messageId',
            'attemptId',
            'outcome',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'receipt',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'messageId': <String, Object?>{
              'type': 'string',
              'pattern': '^outbox:[a-f0-9]{64}\$',
            },
            'attemptId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'outcome': <String, Object?>{
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
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'plan',
            'outcomes',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'configureAutomation',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
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
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'pauseAutomation',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'resumeAutomation',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'resolveAssistance',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'caseId',
                'outcome',
                'owner',
                'expectedRevision',
              ],
              'properties': <String, Object?>{
                'caseId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'outcome': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'resolved',
                    'declined',
                    'transferred',
                  ],
                },
                'owner': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  'description': 'Current organizer manager UID receiving a transferred request; otherwise the authenticated resolving manager UID.',
                },
                'expectedRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            'expectedSourceHash': <String, Object?>{
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
            'actorId',
            'payload',
            'expectedMessageRevision',
            'expectedReviewHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'repairDelivery',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'payload': <String, Object?>{
              'allOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'deliveryId',
                    'action',
                  ],
                  'properties': <String, Object?>{
                    'deliveryId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'action': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'reconcile',
                        'retryDefiniteFailure',
                        'manualHandoff',
                      ],
                    },
                  },
                },
                <String, Object?>{
                  'properties': <String, Object?>{
                    'deliveryId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^outbox:[a-f0-9]{64}\$',
                    },
                  },
                },
              ],
            },
            'expectedMessageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'expectedReviewHash': <String, Object?>{
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
            'actorId',
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'resolveAccountability',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'attendeeId',
                'episodeId',
                'disposition',
              ],
              'properties': <String, Object?>{
                'attendeeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
                  'description': 'Current assistance episode, or explicit absence. The command adapter separately fences the canonical physical check-in.',
                },
                'disposition': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'returned',
                    'departed',
                    'unresolved',
                  ],
                },
              },
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actorId',
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'transferGroup',
            },
            'actorId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'attendeeId',
                'episodeId',
                'expectedParticipationRevision',
                'expectedMembershipRevision',
                'decision',
              ],
              'properties': <String, Object?>{
                'attendeeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'episodeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'expectedParticipationRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'expectedMembershipRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'decision': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'groupId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'place',
                        },
                        'groupId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'from',
                        'to',
                        'receivingOperatorId',
                        'expiresAtMillis',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'propose',
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
                        'receivingOperatorId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'expiresAtMillis': <String, Object?>{
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
                        'transferId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'accept',
                        },
                        'transferId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'transferId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'reject',
                        },
                        'transferId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'transferId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'cancel',
                        },
                        'transferId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
                          'const': 'leave',
                        },
                      },
                    },
                  ],
                },
              },
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      ],
      'type': 'object',
    },
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'movement': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'payload',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'changeRoute',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeRevision',
                'groupId',
                'expectedSourceHash',
                'alternativeId',
                'decisionId',
              ],
              'properties': <String, Object?>{
                'routeRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'groupId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'expectedSourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'alternativeId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^alternative:[a-f0-9]{64}\$',
                },
                'decisionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'confirmDeparture',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'groupId',
                'destination',
                'expectedProgressRevision',
              ],
              'properties': <String, Object?>{
                'groupId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
                'expectedProgressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'departureRoster': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'attendeeIds',
                    'expectedSourceHash',
                  ],
                  'properties': <String, Object?>{
                    'attendeeIds': <String, Object?>{
                      'type': 'array',
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'uniqueItems': true,
                      'maxItems': 1000,
                    },
                    'expectedSourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                  },
                },
                'checkpointRequest': <String, Object?>{
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
              },
            },
            'expectedSourceHash': <String, Object?>{
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
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'recordCheckpoint',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'groupId',
                'checkpointId',
                'accountedFor',
                'expectedProgressRevision',
                'expectedCheckpointRevision',
                'correctionReason',
              ],
              'properties': <String, Object?>{
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
                'accountedFor': <String, Object?>{
                  'type': 'array',
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'maxItems': 1000,
                  'uniqueItems': true,
                },
                'expectedProgressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'expectedCheckpointRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
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
            'expectedSourceHash': <String, Object?>{
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
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'reassignCheckpointReporter',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'groupId',
                'checkpointId',
                'expectedProgressRevision',
                'expectedAssignmentRevision',
                'responsibleOperatorId',
                'reason',
              ],
              'properties': <String, Object?>{
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
                'expectedProgressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'expectedAssignmentRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'responsibleOperatorId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[^/]+\$',
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                  'pattern': '\\S',
                },
              },
            },
            'expectedSourceHash': <String, Object?>{
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
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'setCheckpointCloseout',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'groupId',
                'checkpointId',
                'expectedProgressRevision',
                'reason',
                'expectedCloseoutRevision',
                'decision',
              ],
              'properties': <String, Object?>{
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
                'expectedProgressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                  'pattern': '\\S',
                },
                'expectedCloseoutRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'decision': <String, Object?>{
                  'enum': <Object?>[
                    'close',
                    'reopen',
                  ],
                },
              },
            },
            'expectedSourceHash': <String, Object?>{
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
            'payload',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'resolveAccountability',
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'payload': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'groupId',
                'checkpointId',
                'expectedProgressRevision',
                'attendeeId',
                'expectedAccountabilityRevision',
                'disposition',
              ],
              'properties': <String, Object?>{
                'groupId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'checkpointId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'expectedProgressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 500,
                },
                'attendeeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'expectedAccountabilityRevision': <String, Object?>{
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
              },
            },
          },
        },
      ],
      'type': 'object',
    },
    'staff': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'operatorId',
        'displayName',
        'groupId',
        'expectedRevision',
        'expectedSourceHash',
        'decision',
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
        'groupId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expectedSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'decision': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'duty',
                'expiresAtMillis',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'assign',
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
                  'const': 'remove',
                },
              },
            },
          ],
        },
      },
    },
    'practiceOperatorId': <String, Object?>{
      'type': 'string',
      'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
    },
    'settings': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'expectedSourceHash',
            'groupId',
            'preference',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'setRule',
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
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
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'expectedSourceHash',
            'configuration',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'configure',
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
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
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'expectedSourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'pause',
            },
            'expectedSourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      ],
      'type': 'object',
    },
    'requiredData': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'attendeeId',
        'fieldIds',
        'expiresAt',
        'expectedProfileRevision',
        'expectedRequestRevision',
        'expectedSourceHash',
      ],
      'properties': <String, Object?>{
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
        'expiresAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'description': 'UTC milliseconds.',
        },
        'expectedProfileRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expectedRequestRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expectedSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    'outcome': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'unitId',
        'round',
        'outcome',
        'expectedOutcomeRevision',
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
        'expectedOutcomeRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
    'reveal': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'expectedLiveRevision',
        'decisionId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'startCountdown',
            'cancelPending',
            'publish',
          ],
        },
        'expectedLiveRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'decisionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'allocation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'propose',
            'publish',
          ],
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
        'expectedAllocationRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'proposalId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 200,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'decisionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'allOf': <Object?>[
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'propose',
              },
            },
          },
          'then': <String, Object?>{
            'required': <Object?>[
              'attendeeIds',
              'targetUnitId',
              'expectedAllocationRevision',
            ],
            'not': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'required': <Object?>[
                    'proposalId',
                  ],
                },
                <String, Object?>{
                  'required': <Object?>[
                    'decisionId',
                  ],
                },
              ],
            },
          },
          'else': <String, Object?>{
            'required': <Object?>[
              'proposalId',
              'decisionId',
            ],
            'not': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'required': <Object?>[
                    'attendeeIds',
                  ],
                },
                <String, Object?>{
                  'required': <Object?>[
                    'targetUnitId',
                  ],
                },
                <String, Object?>{
                  'required': <Object?>[
                    'expectedAllocationRevision',
                  ],
                },
              ],
            },
          },
        },
      ],
    },
    'roster': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceId',
        'sourceRevision',
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
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'assistance',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'assistance',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'assistance',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'movement',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'movement',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'movement',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'staff',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'staff',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'staff',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'not': <String, Object?>{
              'enum': <Object?>[
                'assistance',
                'movement',
                'staff',
                'settings',
                'requiredData',
                'outcome',
                'reveal',
                'allocation',
                'roster',
              ],
            },
          },
        },
      },
      'then': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'expectedSetupRevision',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'practiceOperatorId',
        ],
      },
      'then': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'properties': <String, Object?>{
              'action': <String, Object?>{
                'const': 'movement',
              },
            },
          },
          <String, Object?>{
            'properties': <String, Object?>{
              'action': <String, Object?>{
                'const': 'assistance',
              },
              'assistance': <String, Object?>{
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'enum': <Object?>[
                      'transferGroup',
                      'resolveAccountability',
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'settings',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'settings',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'settings',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'requiredData',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'requiredData',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'requiredData',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'outcome',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'outcome',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'outcome',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'reveal',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'reveal',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'reveal',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'allocation',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'allocation',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'roster',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'allocation',
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'roster',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'roster',
          'expectedSetupRevision',
        ],
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'assistance',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'movement',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'staff',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'minutes',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'settings',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'requiredData',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'outcome',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'reveal',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'allocation',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'practiceOperatorId',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'roster',
          ],
        },
      },
    },
  ],
};
