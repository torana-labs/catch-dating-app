// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_assistance_runtime_config_payload.schema.json.

const schemaSetEventAssistanceRuntimeConfigCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'context',
    'requestId',
    'expectedRevision',
    'expectedSourceHash',
    'command',
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    'command': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'configuration',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'configure',
            },
            'configuration': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'options',
                'expiresAt',
                'maxEvaluations',
              ],
              'properties': <String, Object?>{
                'options': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'routes',
                    'responseDeadline',
                    'deliveryPolicy',
                  ],
                  'properties': <String, Object?>{
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
                },
                'expiresAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'maxEvaluations': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 10000,
                },
              },
            },
            'senderReviews': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 3,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'routeId',
                  'senderId',
                  'reviewHash',
                ],
                'properties': <String, Object?>{
                  'routeId': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchEventSms',
                      'organizerEventWhatsapp',
                      'catchEventRcs',
                    ],
                  },
                  'senderId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'reviewHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
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
              'type': 'string',
              'const': 'pause',
            },
          },
        },
      ],
    },
  },
  'title': 'SetEventAssistanceRuntimeConfigCallablePayload',
};
