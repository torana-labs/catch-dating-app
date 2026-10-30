// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/reset_event_rehearsal_payload.schema.json.

const schemaResetEventRehearsalCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/reset_event_rehearsal_payload.schema.json',
  'title': 'ResetEventRehearsalCallablePayload',
  'description': 'Deterministically resets or forks a rehearsal run.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'fork',
    'seed',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fork': <String, Object?>{
      'type': 'boolean',
    },
    'seed': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 2147483647,
    },
  },
};
