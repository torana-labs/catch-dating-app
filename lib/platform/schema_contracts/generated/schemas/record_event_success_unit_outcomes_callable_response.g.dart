// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/record_event_success_unit_outcomes_response.schema.json.

const schemaRecordEventSuccessUnitOutcomesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/record_event_success_unit_outcomes_response.schema.json',
  'title': 'RecordEventSuccessUnitOutcomesCallableResponse',
  'description': 'Persisted outcome revision and standings projection state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'replayed',
    'revision',
    'standingCount',
  ],
  'properties': <String, Object?>{
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'standingCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
  },
};
