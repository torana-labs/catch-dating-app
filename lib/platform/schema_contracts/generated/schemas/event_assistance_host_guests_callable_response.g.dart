// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_host_guests_response.schema.json.

const schemaEventAssistanceHostGuestsCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'context',
    'serverTime',
    'coverage',
    'workflow',
    'runtimeStatus',
    'guests',
  ],
  'properties': <String, Object?>{
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
    'serverTime': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'coverage': <String, Object?>{
      'type': 'string',
      'const': 'selectedAttendees',
    },
    'workflow': <String, Object?>{
      'type': 'string',
      'const': 'lateJoin',
    },
    'runtimeStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unconfigured',
        'paused',
        'sourceChanged',
        'expired',
        'eventClosed',
        'configured',
      ],
    },
    'guests': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 50,
      'items': <String, Object?>{
        'oneOf': <Object?>[
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'attendeeId',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'unavailable',
              },
              'attendeeId': <String, Object?>{
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
              'attendeeId',
              'rosterStatus',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'ineligible',
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'rosterStatus': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'invited',
                  'waitlisted',
                  'cancelled',
                ],
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'attendeeId',
              'checkedIn',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'uninitialized',
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'checkedIn': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'attendeeId',
              'checkedIn',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'sourceChanged',
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'checkedIn': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'attendeeId',
              'checkedIn',
              'episodeId',
              'participation',
              'intention',
              'work',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'current',
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'checkedIn': <String, Object?>{
                'type': 'boolean',
              },
              'episodeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'participation': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'state',
                      'resumeAtUnit',
                    ],
                    'properties': <String, Object?>{
                      'state': <String, Object?>{
                        'const': 'active',
                      },
                      'resumeAtUnit': <String, Object?>{
                        'type': 'null',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'state',
                      'resumeAtUnit',
                    ],
                    'properties': <String, Object?>{
                      'state': <String, Object?>{
                        'const': 'temporaryBreak',
                      },
                      'resumeAtUnit': <String, Object?>{
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
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'state',
                      'resumeAtUnit',
                    ],
                    'properties': <String, Object?>{
                      'state': <String, Object?>{
                        'const': 'departed',
                      },
                      'resumeAtUnit': <String, Object?>{
                        'type': 'null',
                      },
                    },
                  },
                ],
              },
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
              'work': <String, Object?>{
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
                        'const': 'notEnrolled',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'revision',
                      'runStatus',
                      'configurationBinding',
                      'expiresAt',
                      'nextEvaluationAt',
                      'lastEvaluation',
                      'publishedIntentCount',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'recorded',
                      },
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'runStatus': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'running',
                          'paused',
                          'completed',
                        ],
                      },
                      'configurationBinding': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'current',
                          'unbound',
                          'configurationChanged',
                        ],
                      },
                      'expiresAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
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
                      'lastEvaluation': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'at',
                              'observation',
                            ],
                            'properties': <String, Object?>{
                              'at': <String, Object?>{
                                'type': 'integer',
                                'minimum': 0,
                                'maximum': 9007199254740991,
                              },
                              'observation': <String, Object?>{
                                'oneOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'decision',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'decision',
                                      },
                                      'decision': <String, Object?>{
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
                                        'title': 'EventAssistanceLateJoinDecision',
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
                                        'const': 'sourceNotReady',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'episodeMissing',
                                          'guestSourceChanged',
                                          'membershipMissing',
                                          'membershipSourceChanged',
                                          'unconfigured',
                                          'disabled',
                                          'settingSourceChanged',
                                          'eventClosed',
                                          'runtimeNotLive',
                                          'progressUnconfirmed',
                                          'progressSourceChanged',
                                          'destinationUnavailable',
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
                                        'const': 'historyUnavailable',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'historyLimit',
                                          'deliveryConflict',
                                          'ambiguousHistory',
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
                                        'const': 'responseDeadlineMissing',
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
                                        'const': 'episodeChanged',
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
                                        'const': 'workExpired',
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
                                        'const': 'evaluationLimit',
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
                                        'const': 'runtimeUnavailable',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'missing',
                                          'paused',
                                          'configurationChanged',
                                          'sourceChanged',
                                          'expired',
                                          'eventClosed',
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
                      'publishedIntentCount': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  },
  'title': 'EventAssistanceHostGuestsCallableResponse',
};
