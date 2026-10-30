// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/mark_event_attendance_response.schema.json.

const schemaMarkEventAttendanceCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/mark_event_attendance_response.schema.json',
  'title': 'MarkEventAttendanceCallableResponse',
  'description': 'Callable response returned by markEventAttendance.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'attended',
  ],
  'properties': <String, Object?>{
    'attended': <String, Object?>{
      'type': 'boolean',
    },
  },
};
