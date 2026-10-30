// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_deliveries_response.schema.json.

const schemaEventAssistanceDeliveriesCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'context',
    'serverTime',
    'coverage',
    'deliveries',
    'nextCursor',
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
      'const': 'page',
    },
    'deliveries': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'oneOf': <Object?>[
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'messageId',
              'revision',
              'reviewHash',
              'createdAt',
              'expiresAt',
              'lifecycle',
              'deliveryStatus',
              'attempts',
              'coordination',
              'handling',
              'availability',
              'attendeeId',
              'actions',
              'purpose',
            ],
            'properties': <String, Object?>{
              'messageId': <String, Object?>{
                'type': 'string',
                'pattern': '^outbox:[a-f0-9]{64}\$',
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'reviewHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
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
              'lifecycle': <String, Object?>{
                'enum': <Object?>[
                  'active',
                  'cancelled',
                  'superseded',
                  'responded',
                ],
              },
              'deliveryStatus': <String, Object?>{
                'enum': <Object?>[
                  'notSubmitted',
                  'reserved',
                  'unknown',
                  'accepted',
                  'delivered',
                  'read',
                  'failed',
                  'notDispatched',
                  'conflictingEvidence',
                  'revoked',
                ],
              },
              'attempts': <String, Object?>{
                'type': 'array',
                'maxItems': 6,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'channel',
                    'state',
                    'at',
                  ],
                  'properties': <String, Object?>{
                    'channel': <String, Object?>{
                      'enum': <Object?>[
                        'sms',
                        'whatsapp',
                        'rcs',
                      ],
                    },
                    'state': <String, Object?>{
                      'enum': <Object?>[
                        'reserved',
                        'unknown',
                        'accepted',
                        'delivered',
                        'read',
                        'failed',
                        'notDispatched',
                        'revoked',
                      ],
                    },
                    'at': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
              },
              'coordination': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'untracked',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'phase',
                      'reason',
                      'dueAt',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'tracked',
                      },
                      'phase': <String, Object?>{
                        'enum': <Object?>[
                          'queued',
                          'retry',
                          'receipt',
                          'review',
                          'complete',
                        ],
                      },
                      'reason': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'dueAt': <String, Object?>{
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
              'handling': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'automatic',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'actorUid',
                      'at',
                      'authority',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'manual',
                      },
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
                      'authority': <String, Object?>{
                        'enum': <Object?>[
                          'current',
                          'revoked',
                        ],
                      },
                    },
                  },
                ],
              },
              'availability': <String, Object?>{
                'const': 'current',
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'actions': <String, Object?>{
                'type': 'array',
                'maxItems': 1,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'const': 'manualHandoff',
                },
              },
              'purpose': <String, Object?>{
                'enum': <Object?>[
                  'joiningUpdate',
                  'joiningInstructions',
                  'planChanged',
                  'guestRequirement',
                  'assignmentChanged',
                  'participationCheck',
                  'eventCancelled',
                  'eventFinished',
                  'followUp',
                ],
              },
              'displayName': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
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
              'messageId',
              'revision',
              'reviewHash',
              'createdAt',
              'expiresAt',
              'lifecycle',
              'deliveryStatus',
              'attempts',
              'coordination',
              'handling',
              'availability',
              'attendeeId',
              'actions',
              'purpose',
            ],
            'properties': <String, Object?>{
              'messageId': <String, Object?>{
                'type': 'string',
                'pattern': '^outbox:[a-f0-9]{64}\$',
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'reviewHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
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
              'lifecycle': <String, Object?>{
                'enum': <Object?>[
                  'active',
                  'cancelled',
                  'superseded',
                  'responded',
                ],
              },
              'deliveryStatus': <String, Object?>{
                'enum': <Object?>[
                  'notSubmitted',
                  'reserved',
                  'unknown',
                  'accepted',
                  'delivered',
                  'read',
                  'failed',
                  'notDispatched',
                  'conflictingEvidence',
                  'revoked',
                ],
              },
              'attempts': <String, Object?>{
                'type': 'array',
                'maxItems': 6,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'channel',
                    'state',
                    'at',
                  ],
                  'properties': <String, Object?>{
                    'channel': <String, Object?>{
                      'enum': <Object?>[
                        'sms',
                        'whatsapp',
                        'rcs',
                      ],
                    },
                    'state': <String, Object?>{
                      'enum': <Object?>[
                        'reserved',
                        'unknown',
                        'accepted',
                        'delivered',
                        'read',
                        'failed',
                        'notDispatched',
                        'revoked',
                      ],
                    },
                    'at': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
              },
              'coordination': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'untracked',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'phase',
                      'reason',
                      'dueAt',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'tracked',
                      },
                      'phase': <String, Object?>{
                        'enum': <Object?>[
                          'queued',
                          'retry',
                          'receipt',
                          'review',
                          'complete',
                        ],
                      },
                      'reason': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 80,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'dueAt': <String, Object?>{
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
              'handling': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'automatic',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'actorUid',
                      'at',
                      'authority',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'manual',
                      },
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
                      'authority': <String, Object?>{
                        'enum': <Object?>[
                          'current',
                          'revoked',
                        ],
                      },
                    },
                  },
                ],
              },
              'availability': <String, Object?>{
                'const': 'sourceChanged',
              },
              'attendeeId': <String, Object?>{
                'type': 'null',
              },
              'actions': <String, Object?>{
                'type': 'array',
                'maxItems': 0,
                'items': <String, Object?>{
                  'const': 'manualHandoff',
                },
              },
              'purpose': <String, Object?>{
                'enum': <Object?>[
                  'joiningUpdate',
                  'joiningInstructions',
                  'planChanged',
                  'guestRequirement',
                  'assignmentChanged',
                  'participationCheck',
                  'eventCancelled',
                  'eventFinished',
                  'followUp',
                ],
              },
              'displayName': <String, Object?>{
                'type': 'null',
              },
            },
          },
        ],
      },
    },
    'nextCursor': <String, Object?>{
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
  'title': 'EventAssistanceDeliveriesCallableResponse',
};
