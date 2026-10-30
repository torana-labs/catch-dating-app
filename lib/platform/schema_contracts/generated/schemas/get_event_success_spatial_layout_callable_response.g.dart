// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_success_spatial_layout_response.schema.json.

const schemaGetEventSuccessSpatialLayoutCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_success_spatial_layout_response.schema.json',
  'title': 'GetEventSuccessSpatialLayoutCallableResponse',
  'description': 'Selected reusable layout or null when the event has no spatial map.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'layout',
  ],
  'properties': <String, Object?>{
    'layout': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'layoutId',
            'label',
            'units',
          ],
          'properties': <String, Object?>{
            'layoutId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'units': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 200,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'label',
                  'shape',
                  'capacity',
                  'gridX',
                  'gridY',
                  'order',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                  },
                  'shape': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'round',
                      'rect',
                      'row',
                      'court',
                      'zone',
                    ],
                  },
                  'capacity': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 1000,
                  },
                  'gridX': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 199,
                  },
                  'gridY': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 199,
                  },
                  'order': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 200,
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
};
