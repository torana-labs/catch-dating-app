// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_event_rehearsal_response.schema.json.

const schemaCreateEventRehearsalCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_event_rehearsal_response.schema.json',
  'title': 'CreateEventRehearsalCallableResponse',
  'description': 'Identifiers and guest link returned when a rehearsal is created.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'guestUrl',
    'setupRevision',
    'runtimeRevision',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
    },
    'guestUrl': <String, Object?>{
      'type': 'string',
    },
    'setupRevision': <String, Object?>{
      'type': 'integer',
    },
    'runtimeRevision': <String, Object?>{
      'type': 'integer',
    },
  },
};
