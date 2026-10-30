// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_forms_payload.schema.json.

const schemaListOrganizerFormsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_forms_payload.schema.json',
  'title': 'ListOrganizerFormsCallablePayload',
  'description': 'Lists bounded organizer form summaries using an opaque cursor.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'statuses',
    'purposes',
    'query',
    'cursor',
    'limit',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'statuses': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'draft',
          'published',
          'paused',
          'archived',
        ],
      },
    },
    'purposes': <String, Object?>{
      'type': 'array',
      'maxItems': 6,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'application',
          'registration',
          'intake',
          'waiver',
          'feedback',
          'survey',
        ],
      },
    },
    'query': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
  },
};
