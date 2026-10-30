// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_publication_response.schema.json.

const schemaEventPublicationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_publication_response.schema.json',
  'title': 'EventPublicationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'setupRevision',
    'replayed',
    'publicationState',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'setupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
    'publicationState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'private',
        'published',
      ],
    },
  },
};
