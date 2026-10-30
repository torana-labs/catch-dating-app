// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/run_organizer_moment_response.schema.json.

const schemaRunOrganizerMomentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/run_organizer_moment_response.schema.json',
  'title': 'RunOrganizerMomentCallableResponse',
  'description': 'Result of a manual moment fire: the deterministic run id.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'runId',
  ],
  'properties': <String, Object?>{
    'runId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 300,
    },
  },
};
