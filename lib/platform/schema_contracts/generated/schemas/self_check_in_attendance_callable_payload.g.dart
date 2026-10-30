// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/self_check_in_attendance_payload.schema.json.

const schemaSelfCheckInAttendanceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/self_check_in_attendance_payload.schema.json',
  'title': 'SelfCheckInAttendanceCallablePayload',
  'description': 'Callable payload accepted by selfCheckInAttendance.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'venueSessionToken',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'venueSessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 2048,
    },
  },
};
