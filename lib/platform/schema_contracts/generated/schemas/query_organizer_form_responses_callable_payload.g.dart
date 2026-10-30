// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/query_organizer_form_responses_payload.schema.json.

const schemaQueryOrganizerFormResponsesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/query_organizer_form_responses_payload.schema.json',
  'title': 'QueryOrganizerFormResponsesCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'statuses',
    'predicate',
    'sort',
    'limit',
    'cursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'formId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'versionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'statuses': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'submitted',
          'withdrawn',
        ],
      },
    },
    'predicate': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'maxProperties': 5,
      'additionalProperties': true,
      'description': 'Published-version-aware compiler validates ALL/ANY tree, operators, value types, sensitive exclusion, depth 3 and maximum 20 leaves before any response scan.',
    },
    'sort': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'questionId',
        'direction',
        'nulls',
      ],
      'properties': <String, Object?>{
        'questionId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'direction': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'asc',
            'desc',
          ],
        },
        'nulls': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'first',
            'last',
          ],
        },
      },
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
