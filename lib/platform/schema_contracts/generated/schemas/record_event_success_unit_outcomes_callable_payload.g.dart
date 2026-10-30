// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_event_success_unit_outcomes_payload.schema.json.

const schemaRecordEventSuccessUnitOutcomesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_event_success_unit_outcomes_payload.schema.json',
  'title': 'RecordEventSuccessUnitOutcomesCallablePayload',
  'description': 'Revision-fenced Host payload that replaces one complete unit-outcome round.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
    'roundIndex',
    'entries',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
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
        'oneOf': <Object?>[
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'unitId',
              'unitLabel',
              'completed',
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
              'completed': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'unitId',
              'unitLabel',
              'score',
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
              'score': <String, Object?>{
                'type': 'number',
                'minimum': -1000000,
                'maximum': 1000000,
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'unitId',
              'unitLabel',
              'rank',
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
              'rank': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 200,
              },
            },
          },
        ],
      },
    },
  },
};
