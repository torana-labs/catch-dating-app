// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_success_standings.schema.json.

const schemaEventSuccessStandingsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_success_standings.schema.json',
  'title': 'EventSuccessStandingsDocument',
  'description': 'Server-owned attendee-readable standings snapshots stored at eventSuccessStandings/{eventId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventSuccessStandings',
  'x-firestore-path': 'eventSuccessStandings/{eventId}',
  'x-document-id-field': 'id',
  'x-owner': 'recordEventSuccessUnitOutcomes callable',
  'required': <Object?>[
    'eventId',
    'clubId',
    'unitOutcome',
    'revision',
    'latestRoundIndex',
    'rounds',
    'entries',
    'createdAt',
    'updatedAt',
  ],
  'definitions': <String, Object?>{
    'standingEntry': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'unitId',
        'unitLabel',
        'position',
        'value',
        'roundsRecorded',
      ],
      'properties': <String, Object?>{
        'unitId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
        },
        'unitLabel': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'position': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 200,
        },
        'value': <String, Object?>{
          'type': 'number',
          'minimum': -100000000,
          'maximum': 100000000,
        },
        'roundsRecorded': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 101,
        },
      },
    },
  },
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'unitOutcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'score',
        'rank',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
      'x-catch-ownership': 'callable-owned',
    },
    'latestRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
      'x-catch-ownership': 'callable-owned',
    },
    'rounds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 101,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'roundIndex',
          'entries',
        ],
        'properties': <String, Object?>{
          'roundIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100,
          },
          'entries': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 200,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'unitId',
                'unitLabel',
                'position',
                'value',
                'roundsRecorded',
              ],
              'properties': <String, Object?>{
                'unitId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
                },
                'unitLabel': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
                'position': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 200,
                },
                'value': <String, Object?>{
                  'type': 'number',
                  'minimum': -100000000,
                  'maximum': 100000000,
                },
                'roundsRecorded': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 101,
                },
              },
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'entries': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'unitId',
          'unitLabel',
          'position',
          'value',
          'roundsRecorded',
        ],
        'properties': <String, Object?>{
          'unitId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
          },
          'unitLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'position': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
          'value': <String, Object?>{
            'type': 'number',
            'minimum': -100000000,
            'maximum': 100000000,
          },
          'roundsRecorded': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 101,
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
  },
};
