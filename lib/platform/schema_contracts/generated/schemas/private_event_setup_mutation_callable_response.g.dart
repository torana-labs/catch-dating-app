// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/private_event_setup_mutation_response.schema.json.

const schemaPrivateEventSetupMutationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/private_event_setup_mutation_response.schema.json',
  'title': 'PrivateEventSetupMutationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'setupRevision',
    'replayed',
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
  },
};
