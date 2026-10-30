// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_messages.schema.json.

const schemaEventRehearsalMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_rehearsal_messages.schema.json',
  'title': 'EventRehearsalMessageDocument',
  'description': 'Synthetic message evidence isolated from the live outbox; deleted with its rehearsal session.',
  'x-firestore-collection': 'eventRehearsalMessages',
  'x-firestore-path': 'eventRehearsalMessages/{messageDocumentId}',
  'x-document-id-field': 'id',
  'x-owner': 'event rehearsal callables',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'actorId',
    'plan',
    'record',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'actorId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'record': <String, Object?>{
      'title': 'EventAssistanceMessageDocument',
      'description': 'Private durable event-service outbox. The immutable intent and bounded attempt history survive workflow completion and delayed callbacks. Recipient endpoints are references; transport credentials and guest bearer grants belong to their own private stores.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'eventAssistanceMessages',
      'x-firestore-path': 'eventAssistanceMessages/{messageId}',
      'x-document-id-field': 'messageId',
      'x-owner': 'trusted event-assistance workers',
      'required': <Object?>[
        'schemaVersion',
        'messageId',
        'revision',
        'intent',
        'lifecycle',
        'attempts',
        'deliveryConflict',
        'createdAt',
        'updatedAt',
        'response',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'x-catch-ownership': 'server-only',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
          'x-catch-ownership': 'server-only',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
        'intent': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'schemaVersion',
                'intentId',
                'revision',
                'context',
                'eventId',
                'attendeeId',
                'episodeId',
                'workflow',
                'createdAt',
                'expiresAt',
                'permittedRoutes',
                'deliveryPolicy',
                'kind',
                'guidance',
                'choices',
              ],
              'properties': <String, Object?>{
                'schemaVersion': <String, Object?>{
                  'const': 1,
                  'type': 'integer',
                },
                'intentId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 1000000,
                },
                'context': <String, Object?>{
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
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'attendeeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'episodeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'workflow': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'occurrenceId',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'venueReadiness',
                        'routeReadiness',
                        'formatReadiness',
                        'rosterReadiness',
                        'requiredGuestData',
                        'resourceReadiness',
                        'staffingReadiness',
                        'messagingReadiness',
                        'admissionReview',
                        'financialReadiness',
                        'joiningInstructions',
                        'identityResolution',
                        'guestAdmission',
                        'guestCheckIn',
                        'lateJoin',
                        'participationChange',
                        'guestPrerequisite',
                        'allocationRepair',
                        'placementConfirmation',
                        'resourceRecovery',
                        'fairParticipation',
                        'roundPublication',
                        'unitProgress',
                        'outcomeRecording',
                        'programmeRecovery',
                        'departure',
                        'checkpoint',
                        'groupTransfer',
                        'routeRecovery',
                        'locationFreshness',
                        'accountability',
                        'planChangeCommunication',
                        'deliveryRecovery',
                        'replyOwnership',
                        'guestAssistance',
                        'comfortSafety',
                        'attendanceSync',
                        'concurrencyRecovery',
                        'operationRecovery',
                        'contextBoundary',
                        'overrideReview',
                        'eventClosure',
                        'attendanceReconciliation',
                        'financialReconciliation',
                        'postEventFollowUp',
                        'eventLearning',
                      ],
                      'x-catch-catalog': '../catalogs/event_assistance_workflows.json',
                    },
                    'occurrenceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                  },
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
                'permittedRoutes': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 3,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchEventSms',
                      'catchEventRcs',
                      'organizerEventWhatsapp',
                    ],
                  },
                  'uniqueItems': true,
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
                'kind': <String, Object?>{
                  'const': 'joiningUpdate',
                  'type': 'string',
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
                'choices': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 20,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'choiceId',
                      'label',
                      'value',
                    ],
                    'properties': <String, Object?>{
                      'choiceId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'value': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'intention',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'joinIntent',
                                'type': 'string',
                              },
                              'intention': <String, Object?>{
                                'oneOf': <Object?>[
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
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'category',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'requestHelp',
                                'type': 'string',
                              },
                              'category': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'eventLogistics',
                                  'accessibility',
                                  'comfortSafety',
                                  'other',
                                ],
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                'automation': <String, Object?>{
                  'type': 'object',
                  'description': 'Trusted live publisher binding. Queued delivery rechecks the saved policy, current group and episode outreach budget. Absence denotes the pre-existing trusted explicit publisher path, never automatic execution authority.',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'policyVersion',
                    'groupId',
                    'settingId',
                    'settingRevision',
                    'routes',
                    'responseDeadline',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'lateJoin',
                    },
                    'policyVersion': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'settingId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'settingRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'routes': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 3,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'catchEventSms',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'organizerEventWhatsapp',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'catchEventRcs',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                              },
                            },
                          },
                        ],
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
                          'const': null,
                        },
                      ],
                    },
                    'runtimeBinding': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'runtimeId',
                        'revision',
                      ],
                      'properties': <String, Object?>{
                        'runtimeId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
                        },
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
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
                'schemaVersion',
                'intentId',
                'revision',
                'context',
                'eventId',
                'attendeeId',
                'episodeId',
                'workflow',
                'createdAt',
                'expiresAt',
                'permittedRoutes',
                'deliveryPolicy',
                'kind',
                'noticeKind',
                'title',
                'body',
                'instructionRevision',
                'choices',
              ],
              'properties': <String, Object?>{
                'schemaVersion': <String, Object?>{
                  'const': 1,
                  'type': 'integer',
                },
                'intentId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 1000000,
                },
                'context': <String, Object?>{
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
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'attendeeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'episodeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'workflow': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'occurrenceId',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'venueReadiness',
                        'routeReadiness',
                        'formatReadiness',
                        'rosterReadiness',
                        'requiredGuestData',
                        'resourceReadiness',
                        'staffingReadiness',
                        'messagingReadiness',
                        'admissionReview',
                        'financialReadiness',
                        'joiningInstructions',
                        'identityResolution',
                        'guestAdmission',
                        'guestCheckIn',
                        'lateJoin',
                        'participationChange',
                        'guestPrerequisite',
                        'allocationRepair',
                        'placementConfirmation',
                        'resourceRecovery',
                        'fairParticipation',
                        'roundPublication',
                        'unitProgress',
                        'outcomeRecording',
                        'programmeRecovery',
                        'departure',
                        'checkpoint',
                        'groupTransfer',
                        'routeRecovery',
                        'locationFreshness',
                        'accountability',
                        'planChangeCommunication',
                        'deliveryRecovery',
                        'replyOwnership',
                        'guestAssistance',
                        'comfortSafety',
                        'attendanceSync',
                        'concurrencyRecovery',
                        'operationRecovery',
                        'contextBoundary',
                        'overrideReview',
                        'eventClosure',
                        'attendanceReconciliation',
                        'financialReconciliation',
                        'postEventFollowUp',
                        'eventLearning',
                      ],
                      'x-catch-catalog': '../catalogs/event_assistance_workflows.json',
                    },
                    'occurrenceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                  },
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
                'permittedRoutes': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 3,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchEventSms',
                      'catchEventRcs',
                      'organizerEventWhatsapp',
                    ],
                  },
                  'uniqueItems': true,
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
                'kind': <String, Object?>{
                  'const': 'operationalNotice',
                  'type': 'string',
                },
                'noticeKind': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'joiningInstructions',
                    'planChanged',
                    'eventCancelled',
                    'eventFinished',
                    'guestRequirement',
                    'assignmentChanged',
                    'participationCheck',
                    'followUp',
                  ],
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'body': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'instructionRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'choices': <String, Object?>{
                  'type': 'array',
                  'minItems': 0,
                  'maxItems': 20,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'choiceId',
                      'label',
                      'value',
                    ],
                    'properties': <String, Object?>{
                      'choiceId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'value': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'instructionRevision',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'acknowledge',
                                'type': 'string',
                              },
                              'instructionRevision': <String, Object?>{
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
                              'category',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'const': 'requestHelp',
                                'type': 'string',
                              },
                              'category': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'eventLogistics',
                                  'accessibility',
                                  'comfortSafety',
                                  'other',
                                ],
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                'automation': <String, Object?>{
                  'type': 'object',
                  'description': 'Trusted live publisher binding for plan-change and follow-up notices. The delivery worker rechecks the saved assistance setting and every channel permission before sending. Absence denotes an explicit publisher path without automatic delivery authority.',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'noticeKind',
                    'policyVersion',
                    'groupId',
                    'settingId',
                    'settingRevision',
                    'sourceId',
                    'sourceRevision',
                    'contentHash',
                    'routes',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'operationalNotice',
                    },
                    'noticeKind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'planChanged',
                        'followUp',
                      ],
                    },
                    'policyVersion': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'settingId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'settingRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'sourceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'sourceRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'contentHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'routes': <String, Object?>{
                      'type': 'array',
                      'minItems': 1,
                      'maxItems': 3,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'catchEventSms',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'organizerEventWhatsapp',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'routeId',
                              'senderId',
                            ],
                            'properties': <String, Object?>{
                              'routeId': <String, Object?>{
                                'type': 'string',
                                'const': 'catchEventRcs',
                              },
                              'senderId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
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
          ],
          'x-catch-ownership': 'server-only',
        },
        'lifecycle': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'cancelled',
            'superseded',
            'responded',
          ],
          'x-catch-ownership': 'server-only',
        },
        'attempts': <String, Object?>{
          'type': 'array',
          'maxItems': 6,
          'items': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'schemaVersion',
                  'attemptId',
                  'intentId',
                  'intentRevision',
                  'ordinal',
                  'createdAt',
                  'state',
                  'mode',
                  'context',
                  'binding',
                  'authorization',
                ],
                'properties': <String, Object?>{
                  'schemaVersion': <String, Object?>{
                    'const': 1,
                    'type': 'integer',
                  },
                  'attemptId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                  },
                  'intentId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                  },
                  'intentRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 1000000,
                  },
                  'ordinal': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 6,
                  },
                  'createdAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'state': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'reconcileAfter',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'reserved',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'reconcileAfter': <String, Object?>{
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
                          'at',
                          'providerMessageId',
                          'reason',
                          'reconcileAfter',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'unknown',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 512,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'reason': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'timeout',
                              'connectionLost',
                              'workerInterrupted',
                            ],
                          },
                          'reconcileAfter': <String, Object?>{
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
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'accepted',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'delivered',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'read',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                          'classification',
                          'evidenceId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'failed',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 512,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'classification': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'technical',
                              'invalidRecipient',
                              'policy',
                              'suppressed',
                            ],
                          },
                          'evidenceId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                          'evidenceId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'revoked',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                          'evidenceId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'reason',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'notDispatched',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'reason': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'superseded',
                              'eventClosed',
                              'responded',
                              'expired',
                              'permissionRevoked',
                              'hostStopped',
                              'reservationExpired',
                              'permitExpired',
                            ],
                          },
                        },
                        'description': 'No provider request was made. Reservation or permit expiry permits a fresh bounded attempt; the other reasons stop this message.',
                      },
                    ],
                  },
                  'mode': <String, Object?>{
                    'const': 'live',
                    'type': 'string',
                  },
                  'context': <String, Object?>{
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
                  'binding': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'routeId',
                          'transport',
                          'senderIdentity',
                          'provider',
                          'senderId',
                          'bindingRevision',
                          'recipientEndpointId',
                          'fallbackOwner',
                        ],
                        'properties': <String, Object?>{
                          'routeId': <String, Object?>{
                            'const': 'catchEventSms',
                            'type': 'string',
                          },
                          'transport': <String, Object?>{
                            'const': 'sms',
                            'type': 'string',
                          },
                          'senderIdentity': <String, Object?>{
                            'const': 'catchPlatform',
                            'type': 'string',
                          },
                          'provider': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'sinch',
                              'gupshup',
                            ],
                          },
                          'senderId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'bindingRevision': <String, Object?>{
                            'type': 'integer',
                            'minimum': 1,
                            'maximum': 9007199254740991,
                          },
                          'recipientEndpointId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'fallbackOwner': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'catch',
                              'provider',
                            ],
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'routeId',
                          'transport',
                          'senderIdentity',
                          'provider',
                          'senderId',
                          'bindingRevision',
                          'recipientEndpointId',
                          'fallbackOwner',
                        ],
                        'properties': <String, Object?>{
                          'routeId': <String, Object?>{
                            'const': 'catchEventRcs',
                            'type': 'string',
                          },
                          'transport': <String, Object?>{
                            'const': 'rcs',
                            'type': 'string',
                          },
                          'senderIdentity': <String, Object?>{
                            'const': 'catchPlatform',
                            'type': 'string',
                          },
                          'provider': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'sinch',
                              'gupshup',
                              'googleRbm',
                            ],
                          },
                          'senderId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'bindingRevision': <String, Object?>{
                            'type': 'integer',
                            'minimum': 1,
                            'maximum': 9007199254740991,
                          },
                          'recipientEndpointId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'fallbackOwner': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'catch',
                              'provider',
                            ],
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'routeId',
                          'transport',
                          'senderIdentity',
                          'provider',
                          'senderId',
                          'bindingRevision',
                          'recipientEndpointId',
                          'fallbackOwner',
                        ],
                        'properties': <String, Object?>{
                          'routeId': <String, Object?>{
                            'const': 'organizerEventWhatsapp',
                            'type': 'string',
                          },
                          'transport': <String, Object?>{
                            'const': 'whatsapp',
                            'type': 'string',
                          },
                          'senderIdentity': <String, Object?>{
                            'const': 'organizerManaged',
                            'type': 'string',
                          },
                          'provider': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'meta',
                            ],
                          },
                          'senderId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'bindingRevision': <String, Object?>{
                            'type': 'integer',
                            'minimum': 1,
                            'maximum': 9007199254740991,
                          },
                          'recipientEndpointId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                          'fallbackOwner': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'catch',
                              'provider',
                            ],
                          },
                        },
                      },
                    ],
                  },
                  'authorization': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'permissionRevision',
                      'checkedAt',
                      'validUntil',
                      'instructionRevision',
                    ],
                    'properties': <String, Object?>{
                      'permissionRevision': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 512,
                      },
                      'checkedAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'validUntil': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'instructionRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'schemaVersion',
                  'attemptId',
                  'intentId',
                  'intentRevision',
                  'ordinal',
                  'createdAt',
                  'state',
                  'mode',
                  'context',
                  'routeId',
                  'authorization',
                ],
                'properties': <String, Object?>{
                  'schemaVersion': <String, Object?>{
                    'const': 1,
                    'type': 'integer',
                  },
                  'attemptId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                  },
                  'intentId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                  },
                  'intentRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 1000000,
                  },
                  'ordinal': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 6,
                  },
                  'createdAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'state': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'reconcileAfter',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'reserved',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'reconcileAfter': <String, Object?>{
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
                          'at',
                          'providerMessageId',
                          'reason',
                          'reconcileAfter',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'unknown',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 512,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'reason': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'timeout',
                              'connectionLost',
                              'workerInterrupted',
                            ],
                          },
                          'reconcileAfter': <String, Object?>{
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
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'accepted',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'delivered',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'read',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                          'classification',
                          'evidenceId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'failed',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 512,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'classification': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'technical',
                              'invalidRecipient',
                              'policy',
                              'suppressed',
                            ],
                          },
                          'evidenceId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'providerMessageId',
                          'evidenceId',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'revoked',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'providerMessageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 512,
                          },
                          'evidenceId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                          'at',
                          'reason',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'notDispatched',
                            'type': 'string',
                          },
                          'at': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                          'reason': <String, Object?>{
                            'type': 'string',
                            'enum': <Object?>[
                              'superseded',
                              'eventClosed',
                              'responded',
                              'expired',
                              'permissionRevoked',
                              'hostStopped',
                              'reservationExpired',
                              'permitExpired',
                            ],
                          },
                        },
                        'description': 'No provider request was made. Reservation or permit expiry permits a fresh bounded attempt; the other reasons stop this message.',
                      },
                    ],
                  },
                  'mode': <String, Object?>{
                    'const': 'rehearsal',
                    'type': 'string',
                  },
                  'context': <String, Object?>{
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
                  'routeId': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchEventSms',
                      'catchEventRcs',
                      'organizerEventWhatsapp',
                    ],
                  },
                  'authorization': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'permissionRevision',
                      'checkedAt',
                      'validUntil',
                      'instructionRevision',
                    ],
                    'properties': <String, Object?>{
                      'permissionRevision': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 512,
                      },
                      'checkedAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'validUntil': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'instructionRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                },
              },
            ],
          },
          'x-catch-ownership': 'server-only',
        },
        'deliveryConflict': <String, Object?>{
          'type': 'boolean',
          'x-catch-ownership': 'server-only',
        },
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
        'updatedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
        'response': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'schemaVersion',
                    'responseId',
                    'intentId',
                    'intentRevision',
                    'eventId',
                    'attendeeId',
                    'episodeId',
                    'choiceId',
                    'receivedAt',
                    'value',
                    'context',
                    'source',
                  ],
                  'properties': <String, Object?>{
                    'schemaVersion': <String, Object?>{
                      'const': 1,
                      'type': 'integer',
                    },
                    'responseId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 1000000,
                    },
                    'eventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'attendeeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'episodeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'choiceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'receivedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'value': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'intention',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'joinIntent',
                              'type': 'string',
                            },
                            'intention': <String, Object?>{
                              'oneOf': <Object?>[
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
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'instructionRevision',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'acknowledge',
                              'type': 'string',
                            },
                            'instructionRevision': <String, Object?>{
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
                            'category',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'requestHelp',
                              'type': 'string',
                            },
                            'category': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'eventLogistics',
                                'accessibility',
                                'comfortSafety',
                                'other',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'context': <String, Object?>{
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
                    'source': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'linkId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'guestWeb',
                          'type': 'string',
                        },
                        'linkId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                        },
                      },
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'schemaVersion',
                    'responseId',
                    'intentId',
                    'intentRevision',
                    'eventId',
                    'attendeeId',
                    'episodeId',
                    'choiceId',
                    'receivedAt',
                    'value',
                    'context',
                    'source',
                  ],
                  'properties': <String, Object?>{
                    'schemaVersion': <String, Object?>{
                      'const': 1,
                      'type': 'integer',
                    },
                    'responseId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 1000000,
                    },
                    'eventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'attendeeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'episodeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'choiceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'receivedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'value': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'intention',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'joinIntent',
                              'type': 'string',
                            },
                            'intention': <String, Object?>{
                              'oneOf': <Object?>[
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
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'instructionRevision',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'acknowledge',
                              'type': 'string',
                            },
                            'instructionRevision': <String, Object?>{
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
                            'category',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'requestHelp',
                              'type': 'string',
                            },
                            'category': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'eventLogistics',
                                'accessibility',
                                'comfortSafety',
                                'other',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'context': <String, Object?>{
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
                    'source': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'attemptId',
                        'providerEventId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'provider',
                          'type': 'string',
                        },
                        'attemptId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                        },
                        'providerEventId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 512,
                        },
                      },
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'schemaVersion',
                    'responseId',
                    'intentId',
                    'intentRevision',
                    'eventId',
                    'attendeeId',
                    'episodeId',
                    'choiceId',
                    'receivedAt',
                    'value',
                    'context',
                    'source',
                  ],
                  'properties': <String, Object?>{
                    'schemaVersion': <String, Object?>{
                      'const': 1,
                      'type': 'integer',
                    },
                    'responseId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'intentRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 1000000,
                    },
                    'eventId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'attendeeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'episodeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'choiceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                    },
                    'receivedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'value': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'intention',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'joinIntent',
                              'type': 'string',
                            },
                            'intention': <String, Object?>{
                              'oneOf': <Object?>[
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
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'instructionRevision',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'acknowledge',
                              'type': 'string',
                            },
                            'instructionRevision': <String, Object?>{
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
                            'category',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'requestHelp',
                              'type': 'string',
                            },
                            'category': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'eventLogistics',
                                'accessibility',
                                'comfortSafety',
                                'other',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'context': <String, Object?>{
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
                    'source': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'actionId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'simulation',
                          'type': 'string',
                        },
                        'actionId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                        },
                      },
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
        'handoff': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'actorUid',
            'at',
            'operationId',
          ],
          'properties': <String, Object?>{
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
            'operationId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
          'x-catch-ownership': 'server-only',
        },
      },
      'allOf': <Object?>[
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'lifecycle': <String, Object?>{
                'const': 'responded',
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'response': <String, Object?>{
                'type': 'object',
              },
            },
          },
          'else': <String, Object?>{
            'properties': <String, Object?>{
              'response': <String, Object?>{
                'type': 'null',
              },
            },
          },
        },
        <String, Object?>{
          'if': <String, Object?>{
            'required': <Object?>[
              'handoff',
            ],
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'intent': <String, Object?>{
                'properties': <String, Object?>{
                  'context': <String, Object?>{
                    'properties': <String, Object?>{
                      'mode': <String, Object?>{
                        'const': 'live',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'handoff': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'actorUid',
        'at',
        'operationId',
      ],
      'properties': <String, Object?>{
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
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'membershipBinding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'episodeId',
        'groupId',
        'groupSourceHash',
        'assignmentRevision',
      ],
      'properties': <String, Object?>{
        'episodeId': <String, Object?>{
          'type': 'string',
          'pattern': '^episode:[a-f0-9]{64}\$',
        },
        'groupId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'groupSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'assignmentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
      'description': 'Server-derived accepted-group proof for a group checkpoint instruction. Unbound historical group messages remain evidence only.',
      'x-catch-ownership': 'server-only',
    },
    'movementBinding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'groupId',
        'progressRevision',
        'sourceHash',
      ],
      'properties': <String, Object?>{
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
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
      'description': 'Server-derived confirmed departure proof. Historical messages without this proof remain evidence only.',
      'x-catch-ownership': 'server-only',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'record': <String, Object?>{
          'properties': <String, Object?>{
            'intent': <String, Object?>{
              'properties': <String, Object?>{
                'context': <String, Object?>{
                  'properties': <String, Object?>{
                    'mode': <String, Object?>{
                      'const': 'rehearsal',
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
};
