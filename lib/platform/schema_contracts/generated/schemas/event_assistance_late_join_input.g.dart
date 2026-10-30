// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_late_join_input.schema.json.

const schemaEventAssistanceLateJoinInputSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'eventOpen',
    'departureConfirmed',
    'now',
    'policy',
    'guest',
    'guidance',
    'lastMessage',
    'messagesThisEpisode',
    'context',
    'setting',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'eventOpen': <String, Object?>{
      'type': 'boolean',
    },
    'departureConfirmed': <String, Object?>{
      'type': 'boolean',
    },
    'now': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'UTC milliseconds.',
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
    'guest': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'attendeeId',
        'episodeId',
        'admission',
        'attendance',
        'intention',
        'deliveryEligibility',
        'participation',
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
        'admission': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'admitted',
            'pending',
            'declined',
          ],
        },
        'attendance': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'value',
                'revision',
                'observedAt',
                'source',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'known',
                },
                'value': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'checkedIn',
                  ],
                  'properties': <String, Object?>{
                    'checkedIn': <String, Object?>{
                      'type': 'boolean',
                    },
                  },
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
                },
                'observedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'UTC milliseconds.',
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'host',
                    'guest',
                    'provider',
                    'system',
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
                  'const': 'unknown',
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'notCollected',
                    'notConfirmed',
                    'sourceUnavailable',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'lastValue',
                'observedAt',
                'staleAt',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'stale',
                },
                'lastValue': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'checkedIn',
                  ],
                  'properties': <String, Object?>{
                    'checkedIn': <String, Object?>{
                      'type': 'boolean',
                    },
                  },
                },
                'observedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'UTC milliseconds.',
                },
                'staleAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'UTC milliseconds.',
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
        'deliveryEligibility': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eligible',
            'unreachable',
            'unknown',
          ],
        },
        'participation': <String, Object?>{
          'enum': <Object?>[
            'active',
            'temporaryBreak',
            'departed',
            'unknown',
          ],
        },
      },
    },
    'guidance': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'value',
            'revision',
            'observedAt',
            'source',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'known',
            },
            'value': <String, Object?>{
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
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'Nonnegative safe integer revision.',
            },
            'observedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'UTC milliseconds.',
            },
            'source': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'host',
                'guest',
                'provider',
                'system',
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
              'const': 'unknown',
            },
            'reason': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notCollected',
                'notConfirmed',
                'sourceUnavailable',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'lastValue',
            'observedAt',
            'staleAt',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'stale',
            },
            'lastValue': <String, Object?>{
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
            'observedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'UTC milliseconds.',
            },
            'staleAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'UTC milliseconds.',
            },
          },
        },
      ],
    },
    'lastMessage': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'materialKey',
            'at',
          ],
          'properties': <String, Object?>{
            'materialKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'at': <String, Object?>{
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
    'messagesThisEpisode': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
    'responseDeadline': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'UTC milliseconds.',
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
    'setting': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'authority',
            'policyVersion',
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
            'policyVersion': <String, Object?>{
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
  },
  'allOf': <Object?>[
    <String, Object?>{
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
        'required': <Object?>[
          'responseDeadline',
        ],
      },
    },
  ],
  'title': 'EventAssistanceLateJoinInput',
};
