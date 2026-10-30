// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/mark_event_attendance_payload.schema.json.

const schemaMarkEventAttendanceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/mark_event_attendance_payload.schema.json',
  'title': 'MarkEventAttendanceCallablePayload',
  'description': 'Callable payload accepted by markEventAttendance.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'userId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'userId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
