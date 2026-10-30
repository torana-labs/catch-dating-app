// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/set_event_attendee_attendance_response.schema.json.

const schemaSetEventAttendeeAttendanceCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/set_event_attendee_attendance_response.schema.json',
  'title': 'SetEventAttendeeAttendanceCallableResponse',
  'description': 'Authoritative outcome for an absolute operational-roster attendance mutation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'attendeeId',
    'checkedIn',
    'acceptedRevision',
    'replayed',
    'changed',
  ],
  'properties': <String, Object?>{
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'checkedIn': <String, Object?>{
      'type': 'boolean',
    },
    'acceptedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
    'changed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
