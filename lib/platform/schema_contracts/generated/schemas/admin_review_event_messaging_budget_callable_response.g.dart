// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_review_event_messaging_budget_response.schema.json.

const schemaAdminReviewEventMessagingBudgetCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_review_event_messaging_budget_response.schema.json',
  'title': 'AdminReviewEventMessagingBudgetCallableResponse',
  'description': 'Read-only Finance review of one current messaging setup and its current revision-fenced decision. The response grants no spending or dispatch authority.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'review',
    'decision',
    'grantsSpendingAuthority',
    'grantsDispatchAuthority',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'review': <String, Object?>{
      'title': 'EventMessagingSetupReview',
      'description': 'Read-only operator review of one event messaging runtime, sender and its two spending ceilings. This artifact grants no dispatch or spending authority.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'kind',
        'context',
        'routeId',
        'senderId',
        'purpose',
        'observedAt',
        'completedAt',
        'grantsDispatchAuthority',
        'runtime',
        'sender',
        'budgets',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'recordedSetupReview',
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
        'routeId': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchEventSms',
            'catchEventRcs',
            'organizerEventWhatsapp',
          ],
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'joiningUpdate',
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
        'observedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'completedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'grantsDispatchAuthority': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
        'runtime': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'appliesToPurpose',
            'status',
            'revision',
            'selected',
            'sourceHash',
            'eventEnd',
          ],
          'properties': <String, Object?>{
            'appliesToPurpose': <String, Object?>{
              'type': 'boolean',
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
            'revision': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'selected': <String, Object?>{
              'type': 'boolean',
            },
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'eventEnd': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        'sender': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeId',
                'senderId',
                'displayName',
                'displayAddress',
                'availability',
                'reviewHash',
              ],
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catchEventSms',
                    'catchEventRcs',
                    'organizerEventWhatsapp',
                  ],
                },
                'senderId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'displayName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'displayAddress': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 2000,
                },
                'availability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'eligible',
                    'setupRequired',
                    'approvalExpired',
                    'templateUnavailable',
                  ],
                },
                'reviewHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'budgets': <String, Object?>{
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
                  'const': 'senderUnavailable',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'currency',
                'sourceHash',
                'event',
                'senderDay',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'reviewed',
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'event': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'budgetId',
                        'scope',
                        'kind',
                        'reason',
                      ],
                      'properties': <String, Object?>{
                        'budgetId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'scope': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'context',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'event',
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
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'day',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'senderDay',
                                },
                                'day': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                                },
                              },
                            },
                          ],
                        },
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'unavailable',
                        },
                        'reason': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'missing',
                            'invalid',
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'budgetId',
                        'scope',
                        'kind',
                        'issue',
                        'revision',
                        'approvalId',
                        'currency',
                        'limitMicros',
                        'chargedMicros',
                        'remainingMicros',
                        'startsAt',
                        'endsAt',
                        'reviewHash',
                      ],
                      'properties': <String, Object?>{
                        'budgetId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'scope': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'context',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'event',
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
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'day',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'senderDay',
                                },
                                'day': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                                },
                              },
                            },
                          ],
                        },
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'recorded',
                        },
                        'issue': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'enum': <Object?>[
                            'paused',
                            'expired',
                            'currencyChanged',
                            'agentChanged',
                            'exhausted',
                            null,
                          ],
                        },
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'approvalId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'currency': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[A-Z]{3}\$',
                        },
                        'limitMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'chargedMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'remainingMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'startsAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'endsAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reviewHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
                        },
                      },
                    },
                  ],
                },
                'senderDay': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'budgetId',
                        'scope',
                        'kind',
                        'reason',
                      ],
                      'properties': <String, Object?>{
                        'budgetId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'scope': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'context',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'event',
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
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'day',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'senderDay',
                                },
                                'day': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                                },
                              },
                            },
                          ],
                        },
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'unavailable',
                        },
                        'reason': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'missing',
                            'invalid',
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'budgetId',
                        'scope',
                        'kind',
                        'issue',
                        'revision',
                        'approvalId',
                        'currency',
                        'limitMicros',
                        'chargedMicros',
                        'remainingMicros',
                        'startsAt',
                        'endsAt',
                        'reviewHash',
                      ],
                      'properties': <String, Object?>{
                        'budgetId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'scope': <String, Object?>{
                          'oneOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'context',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'event',
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
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'day',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'senderDay',
                                },
                                'day': <String, Object?>{
                                  'type': 'string',
                                  'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                                },
                              },
                            },
                          ],
                        },
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'recorded',
                        },
                        'issue': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'enum': <Object?>[
                            'paused',
                            'expired',
                            'currencyChanged',
                            'agentChanged',
                            'exhausted',
                            null,
                          ],
                        },
                        'revision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'approvalId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'currency': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[A-Z]{3}\$',
                        },
                        'limitMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'chargedMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'remainingMicros': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'startsAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'endsAt': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'reviewHash': <String, Object?>{
                          'type': 'string',
                          'pattern': '^[a-f0-9]{64}\$',
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
      'definitions': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'time': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchEventSms',
            'catchEventRcs',
            'organizerEventWhatsapp',
          ],
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'joiningUpdate',
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
        'sender': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'routeId',
            'senderId',
            'displayName',
            'displayAddress',
            'availability',
            'reviewHash',
          ],
          'properties': <String, Object?>{
            'routeId': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchEventSms',
                'catchEventRcs',
                'organizerEventWhatsapp',
              ],
            },
            'senderId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'displayName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'displayAddress': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 2000,
            },
            'availability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'eligible',
                'setupRequired',
                'approvalExpired',
                'templateUnavailable',
              ],
            },
            'reviewHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        'budgetScope': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'context',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'event',
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
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'day',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'senderDay',
                },
                'day': <String, Object?>{
                  'type': 'string',
                  'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                },
              },
            },
          ],
        },
        'budgetReview': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'budgetId',
                'scope',
                'kind',
                'reason',
              ],
              'properties': <String, Object?>{
                'budgetId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'scope': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'context',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'event',
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
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'day',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'senderDay',
                        },
                        'day': <String, Object?>{
                          'type': 'string',
                          'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                        },
                      },
                    },
                  ],
                },
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'unavailable',
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'missing',
                    'invalid',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'budgetId',
                'scope',
                'kind',
                'issue',
                'revision',
                'approvalId',
                'currency',
                'limitMicros',
                'chargedMicros',
                'remainingMicros',
                'startsAt',
                'endsAt',
                'reviewHash',
              ],
              'properties': <String, Object?>{
                'budgetId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'scope': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'context',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'event',
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
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'day',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'senderDay',
                        },
                        'day': <String, Object?>{
                          'type': 'string',
                          'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                        },
                      },
                    },
                  ],
                },
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'recorded',
                },
                'issue': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    'paused',
                    'expired',
                    'currencyChanged',
                    'agentChanged',
                    'exhausted',
                    null,
                  ],
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'approvalId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'limitMicros': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'chargedMicros': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'remainingMicros': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'startsAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'endsAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'reviewHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          ],
        },
      },
    },
    'decision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'decisionId',
            'revision',
            'decisionStatus',
            'decisionKind',
            'reviewedByUid',
            'note',
            'effect',
            'grantsSpendingAuthority',
          ],
          'properties': <String, Object?>{
            'decisionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'decisionStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'approved',
                'held',
                'rejected',
              ],
            },
            'decisionKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'approve',
                'hold',
                'reject',
              ],
            },
            'reviewedByUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'note': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            'effect': <String, Object?>{
              'type': 'string',
              'const': 'decision_only_no_spending_authority',
            },
            'grantsSpendingAuthority': <String, Object?>{
              'type': 'boolean',
              'const': false,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'grantsSpendingAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'grantsDispatchAuthority': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
  },
  'definitions': <String, Object?>{
    'decisionSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'decisionId',
        'revision',
        'decisionStatus',
        'decisionKind',
        'reviewedByUid',
        'note',
        'effect',
        'grantsSpendingAuthority',
      ],
      'properties': <String, Object?>{
        'decisionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'decisionStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'approved',
            'held',
            'rejected',
          ],
        },
        'decisionKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'approve',
            'hold',
            'reject',
          ],
        },
        'reviewedByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'note': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'effect': <String, Object?>{
          'type': 'string',
          'const': 'decision_only_no_spending_authority',
        },
        'grantsSpendingAuthority': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
      },
    },
  },
};
