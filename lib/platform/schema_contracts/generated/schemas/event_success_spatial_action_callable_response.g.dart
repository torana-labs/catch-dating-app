// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_success_spatial_action_response.schema.json.

const schemaEventSuccessSpatialActionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_success_spatial_action_response.schema.json',
  'title': 'EventSuccessSpatialActionCallableResponse',
  'description': 'Current revision and optional destination validation for a Host spatial action.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'revision',
    'destinations',
  ],
  'properties': <String, Object?>{
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'destinations': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'unitId',
          'valid',
          'reason',
          'recommendedScope',
        ],
        'properties': <String, Object?>{
          'unitId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
          },
          'valid': <String, Object?>{
            'type': 'boolean',
          },
          'reason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'capacity',
              'safetyKeepApart',
              'declaredConstraint',
              null,
            ],
          },
          'recommendedScope': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'thisRound',
              'pinned',
              null,
            ],
          },
        },
      },
    },
  },
};
