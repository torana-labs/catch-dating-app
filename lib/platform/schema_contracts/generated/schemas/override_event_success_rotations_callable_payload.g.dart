// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/override_event_success_rotations_payload.schema.json.

const schemaOverrideEventSuccessRotationsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/override_event_success_rotations_payload.schema.json',
  'title': 'OverrideEventSuccessRotationsCallablePayload',
  'description': 'Callable payload accepted by overrideEventSuccessRotations.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
    'rounds',
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
    'rounds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 32,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'roundIndex',
          'pairings',
        ],
        'properties': <String, Object?>{
          'roundIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 31,
          },
          'pairings': <String, Object?>{
            'type': 'array',
            'minItems': 0,
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'uidA',
                'uidB',
              ],
              'properties': <String, Object?>{
                'uidA': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'uidB': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
              },
            },
          },
        },
      },
    },
  },
};
