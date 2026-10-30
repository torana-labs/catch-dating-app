// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_runtime_configs.schema.json.

const schemaEventAssistanceRuntimeConfigDocumentSchema = <String, Object?>{
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
  'title': 'EventAssistanceRuntimeConfigDocument',
  'x-firestore-collection': 'eventAssistanceRuntimeConfigs',
  'x-firestore-path': 'eventAssistanceRuntimeConfigs/{runtimeId}',
  'x-document-id-field': 'runtimeId',
  'x-owner': 'event-assistance runtime configuration',
};
