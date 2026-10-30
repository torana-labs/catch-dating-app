// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_publication_payload.schema.json.

const schemaSetEventPublicationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_event_publication_payload.schema.json',
  'title': 'SetEventPublicationCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'eventId',
    'expectedSetupRevision',
    'publicationState',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,127}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 2147483646,
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
