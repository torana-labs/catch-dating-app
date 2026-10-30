// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/private_event_setup_list_response.schema.json.

const schemaPrivateEventSetupListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/private_event_setup_list_response.schema.json',
  'title': 'PrivateEventSetupListCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'events',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'events': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventId',
          'name',
          'city',
          'localDate',
          'localStartTime',
          'timezone',
          'startTimeMillis',
          'setupRevision',
          'status',
          'detailsConfigured',
        ],
        'properties': <String, Object?>{
          'eventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'city': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'cityId',
              'marketId',
            ],
            'properties': <String, Object?>{
              'cityId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'marketId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
            },
          },
          'localDate': <String, Object?>{
            'type': 'string',
            'pattern': '^[0-9]{4}-[0-9]{2}-[0-9]{2}\$',
          },
          'localStartTime': <String, Object?>{
            'type': 'string',
            'pattern': '^[0-9]{2}:[0-9]{2}\$',
          },
          'timezone': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 100,
          },
          'startTimeMillis': <String, Object?>{
            'type': 'integer',
          },
          'setupRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'active',
              'cancelled',
            ],
          },
          'detailsConfigured': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1024,
          'pattern': '^[A-Za-z0-9_-]+\$',
        },
      ],
    },
  },
};
