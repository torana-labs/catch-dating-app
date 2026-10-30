// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/check_in_event_runtime_response.schema.json.

const schemaCheckInEventRuntimeCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/check_in_event_runtime_response.schema.json',
  'title': 'CheckInEventRuntimeCallableResponse',
  'description': 'Idempotent operational attendance result for the no-download runtime.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'alreadyCheckedIn',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'const': 'checkedIn',
    },
    'alreadyCheckedIn': <String, Object?>{
      'type': 'boolean',
    },
  },
};
