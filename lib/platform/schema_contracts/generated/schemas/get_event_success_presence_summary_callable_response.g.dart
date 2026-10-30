// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_success_presence_summary_response.schema.json.

const schemaGetEventSuccessPresenceSummaryCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_success_presence_summary_response.schema.json',
  'title': 'GetEventSuccessPresenceSummaryCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'serverTimeMillis',
    'liveControlRevision',
    'nextRoundIndex',
    'policy',
    'entries',
    'lateArrivals',
  ],
  'properties': <String, Object?>{
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'liveControlRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'nextRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
    'policy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'heartbeatIntervalSeconds',
        'presentWindowSeconds',
        'likelyDepartedAfterSeconds',
      ],
      'properties': <String, Object?>{
        'heartbeatIntervalSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 10,
          'maximum': 300,
        },
        'presentWindowSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 30,
          'maximum': 900,
        },
        'likelyDepartedAfterSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 60,
          'maximum': 3600,
        },
      },
    },
    'entries': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'presenceState',
          'heartbeatAtMillis',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'presenceState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'present',
              'idle',
              'likelyDeparted',
            ],
          },
          'heartbeatAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'lateArrivals': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'checkedInAtMillis',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'checkedInAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'presencePolicy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'heartbeatIntervalSeconds',
        'presentWindowSeconds',
        'likelyDepartedAfterSeconds',
      ],
      'properties': <String, Object?>{
        'heartbeatIntervalSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 10,
          'maximum': 300,
        },
        'presentWindowSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 30,
          'maximum': 900,
        },
        'likelyDepartedAfterSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 60,
          'maximum': 3600,
        },
      },
    },
    'presenceEntry': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'displayName',
        'presenceState',
        'heartbeatAtMillis',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'presenceState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'present',
            'idle',
            'likelyDeparted',
          ],
        },
        'heartbeatAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'lateArrivalEntry': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'displayName',
        'checkedInAtMillis',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'checkedInAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
