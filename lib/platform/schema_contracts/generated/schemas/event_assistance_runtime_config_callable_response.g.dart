// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_runtime_config_response.schema.json.

const schemaEventAssistanceRuntimeConfigCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'outcome',
    'operationRevision',
    'view',
  ],
  'properties': <String, Object?>{
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'read',
        'applied',
        'replayed',
      ],
    },
    'operationRevision': <String, Object?>{
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
    'view': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'serverTime',
        'sourceHash',
        'revision',
        'runtime',
        'status',
        'canConfigure',
        'eventEnd',
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
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'runtime': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'schemaVersion',
                    'runtimeId',
                    'context',
                    'workflowKind',
                    'revision',
                    'status',
                    'configuration',
                    'sourceHash',
                    'sourceGeneration',
                    'updatedBy',
                    'createdAt',
                    'updatedAt',
                  ],
                  'properties': <String, Object?>{
                    'schemaVersion': <String, Object?>{
                      'type': 'integer',
                      'const': 1,
                    },
                    'runtimeId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
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
                    'workflowKind': <String, Object?>{
                      'type': 'string',
                      'const': 'lateJoin',
                    },
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'status': <String, Object?>{
                      'type': 'string',
                      'const': 'enabled',
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
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'sourceGeneration': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'updatedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
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
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'schemaVersion',
                    'runtimeId',
                    'context',
                    'workflowKind',
                    'revision',
                    'status',
                    'configuration',
                    'sourceHash',
                    'sourceGeneration',
                    'updatedBy',
                    'createdAt',
                    'updatedAt',
                  ],
                  'properties': <String, Object?>{
                    'schemaVersion': <String, Object?>{
                      'type': 'integer',
                      'const': 1,
                    },
                    'runtimeId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
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
                    'workflowKind': <String, Object?>{
                      'type': 'string',
                      'const': 'lateJoin',
                    },
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'status': <String, Object?>{
                      'type': 'string',
                      'const': 'paused',
                    },
                    'configuration': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
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
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'sourceGeneration': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'updatedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
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
                  },
                },
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'status': <String, Object?>{
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
        'canConfigure': <String, Object?>{
          'type': 'boolean',
        },
        'eventEnd': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'senderSetup': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'choices',
            'nextCursors',
          ],
          'properties': <String, Object?>{
            'choices': <String, Object?>{
              'type': 'array',
              'maxItems': 63,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'routeId',
                  'senderId',
                  'displayName',
                  'displayAddress',
                  'reviewHash',
                  'availability',
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
                  'displayName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'displayAddress': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 32,
                  },
                  'reviewHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'availability': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'eligible',
                      'setupRequired',
                      'approvalExpired',
                      'joiningTemplateMissing',
                    ],
                  },
                },
              },
            },
            'nextCursors': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[],
              'properties': <String, Object?>{
                'catchEventSms': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'organizerEventWhatsapp': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'catchEventRcs': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
              },
            },
          },
        },
      },
    },
  },
  'title': 'EventAssistanceRuntimeConfigCallableResponse',
};
