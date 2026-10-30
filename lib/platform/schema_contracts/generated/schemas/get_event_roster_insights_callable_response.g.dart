// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_roster_insights_response.schema.json.

const schemaGetEventRosterInsightsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_roster_insights_response.schema.json',
  'title': 'GetEventRosterInsightsCallableResponse',
  'description': 'Manager-only, event-relative attendance and Catch-payment labels for an operational roster. Private Event Success, dating, feedback, and safety data are excluded.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'cutoffAtMillis',
    'sourceCoverage',
    'spendCoverage',
    'rows',
    'computedAtMillis',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'cutoffAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'sourceCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'partial',
      ],
    },
    'spendCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchPaymentsOnly',
        'insufficientData',
      ],
    },
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'attendeeId',
          'contactId',
          'availability',
          'signals',
          'priorAttendedEventCount',
          'priorExpectedEventCount',
          'priorNoShowCount',
          'lastAttendedAtMillis',
          'attendanceRate',
          'catchSpend',
        ],
        'properties': <String, Object?>{
          'attendeeId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'contactId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'availability': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ready',
              'projectionPending',
              'ambiguousIdentity',
              'insufficientHistory',
            ],
          },
          'signals': <String, Object?>{
            'type': 'array',
            'uniqueItems': true,
            'maxItems': 11,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'first_time',
                'returning',
                'regular',
                're_engaging',
                'reliable',
                'needs_confirmation',
                'advocate',
                'high_impact_advocate',
                'known_catch_spender',
                'top_catch_spender',
                'member',
              ],
            },
          },
          'priorAttendedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'priorExpectedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'priorNoShowCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'lastAttendedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'attendanceRate': <String, Object?>{
            'type': <Object?>[
              'number',
              'null',
            ],
            'minimum': 0,
            'maximum': 1,
          },
          'catchSpend': <String, Object?>{
            'type': 'array',
            'maxItems': 12,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'currency',
                'amountMinor',
                'paidOrderCount',
              ],
              'properties': <String, Object?>{
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'amountMinor': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'paidOrderCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
              },
            },
          },
        },
      },
    },
    'computedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
  'definitions': <String, Object?>{
    'signal': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'first_time',
        'returning',
        'regular',
        're_engaging',
        'reliable',
        'needs_confirmation',
        'advocate',
        'high_impact_advocate',
        'known_catch_spender',
        'top_catch_spender',
        'member',
      ],
    },
    'spendAmount': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'currency',
        'amountMinor',
        'paidOrderCount',
      ],
      'properties': <String, Object?>{
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'amountMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'paidOrderCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'row': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'attendeeId',
        'contactId',
        'availability',
        'signals',
        'priorAttendedEventCount',
        'priorExpectedEventCount',
        'priorNoShowCount',
        'lastAttendedAtMillis',
        'attendanceRate',
        'catchSpend',
      ],
      'properties': <String, Object?>{
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'contactId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'availability': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ready',
            'projectionPending',
            'ambiguousIdentity',
            'insufficientHistory',
          ],
        },
        'signals': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 11,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'first_time',
              'returning',
              'regular',
              're_engaging',
              'reliable',
              'needs_confirmation',
              'advocate',
              'high_impact_advocate',
              'known_catch_spender',
              'top_catch_spender',
              'member',
            ],
          },
        },
        'priorAttendedEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'priorExpectedEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'priorNoShowCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'lastAttendedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'attendanceRate': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': 0,
          'maximum': 1,
        },
        'catchSpend': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'currency',
              'amountMinor',
              'paidOrderCount',
            ],
            'properties': <String, Object?>{
              'currency': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z]{3}\$',
              },
              'amountMinor': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'paidOrderCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 1000000,
              },
            },
          },
        },
      },
    },
  },
};
