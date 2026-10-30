// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/offer_event_target_list_response.schema.json.

const schemaOfferEventTargetListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/offer_event_target_list_response.schema.json',
  'title': 'OfferEventTargetListCallableResponse',
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
          'startTimeMillis',
          'timezone',
          'publicationState',
          'setupRevision',
        ],
        'properties': <String, Object?>{
          'eventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'startTimeMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'timezone': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 100,
          },
          'publicationState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'private',
              'published',
            ],
          },
          'setupRevision': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
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
